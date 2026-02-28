// For more information about this file see https://dove.feathersjs.com/guides/cli/authentication.html
import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'

import type { Application } from './declarations'
import { trackUserActivity } from './hooks/track-user-activity'
import { ActivityType } from './services/user-activities/user-activities.schema'

declare module './declarations' {
  interface ServiceTypes {
    authentication: AuthenticationService
  }
}

// Helper function to extract client IP address
const extractClientIP = async (context: any) => {
  if (context.params.provider === 'rest') {
    // For REST requests, try to get IP from various sources
    const headers = context.params.headers || {}

    const forwarded = headers['x-forwarded-for']
    const realIp = headers['x-real-ip']
    const clientIp = headers['x-client-ip']

    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded
      context.params.clientIp = forwardedStr.split(',')[0].trim()
    } else if (realIp) {
      context.params.clientIp = Array.isArray(realIp) ? realIp[0] : realIp
    } else if (clientIp) {
      context.params.clientIp = Array.isArray(clientIp) ? clientIp[0] : clientIp
    } else {
      // For REST requests, check if the origin header gives us a clue
      const origin = headers['origin'] || headers['referer']
      if (origin) {
        try {
          const url = new URL(origin)
          const hostname = url.hostname
          // If it's an IP address, use it
          if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            context.params.clientIp = hostname
          } else {
            context.params.clientIp = '127.0.0.1'
          }
        } catch {
          context.params.clientIp = '127.0.0.1'
        }
      } else {
        context.params.clientIp = '127.0.0.1'
      }
    }
  } else if (context.params.provider === 'socketio') {
    // For Socket.IO requests, extract from connection
    const connection = context.params.connection
    if (connection) {
      // Try different ways to access the socket information
      let realIP = '127.0.0.1'

      // Check various properties that might contain the IP
      if (connection.handshake) {
        realIP =
          connection.handshake.address ||
          connection.handshake.headers?.['x-forwarded-for'] ||
          connection.handshake.headers?.['x-real-ip'] ||
          '127.0.0.1'
      } else if (connection.socket) {
        realIP = connection.socket.remoteAddress || '127.0.0.1'
      } else if (connection.request) {
        realIP =
          connection.request.connection?.remoteAddress ||
          connection.request.socket?.remoteAddress ||
          '127.0.0.1'
      } else {
        // Try to extract from any property that might contain IP info
        for (const [key, value] of Object.entries(connection)) {
          if (value && typeof value === 'object' && 'remoteAddress' in value) {
            realIP = (value as any).remoteAddress
            break
          }
        }
      }

      context.params.clientIp = realIP
    }
  }

  return context
}

export const authentication = (app: Application) => {
  const authentication = new AuthenticationService(app)

  authentication.register('jwt', new JWTStrategy())
  authentication.register('local', new LocalStrategy())

  app.use('authentication', authentication)

  // Add hooks to track login activities
  app.service('authentication').hooks({
    before: {
      create: [
        // Add IP address to params for tracking
        async context => {
          return extractClientIP(context)
        }
      ],
      remove: [
        // Add IP address to params for logout tracking
        async context => {
          return extractClientIP(context)
        }
      ]
    },
    after: {
      create: [trackUserActivity(ActivityType.LOGIN)],
      remove: [trackUserActivity(ActivityType.LOGOUT)]
    },
    error: {
      create: [
        async context => {
          // Track failed authentication attempts
          try {
            const { app, params, error } = context

            // Only track authentication errors, not other types of errors
            if (error.name === 'NotAuthenticated' || error.className === 'not-authenticated') {
              const userActivityService = app.service('user-activities')
              const ipAddress = params.clientIp || '127.0.0.1'
              const userAgent = params.headers?.['user-agent'] || 'Unknown'

              // Try to extract email from the data for better tracking
              const email = context.data?.email || 'Unknown'
              const description = `Failed login attempt for ${email} from ${ipAddress}`

              await userActivityService.create(
                {
                  type: ActivityType.FAILED_LOGIN,
                  description,
                  ipAddress,
                  userAgent,
                  metadata: {
                    method: context.method || 'create',
                    path: context.path || 'authentication',
                    timestamp: new Date().toISOString(),
                    email,
                    errorType: error.name || 'AuthenticationError'
                  }
                },
                {
                  internal: true
                }
              )
            }
          } catch (trackingError) {
            console.error('Failed to track authentication error:', trackingError)
          }

          return context
        }
      ]
    }
  })
}
