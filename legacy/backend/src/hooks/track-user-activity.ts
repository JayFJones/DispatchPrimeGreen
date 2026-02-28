import type { HookContext } from '../declarations'
import { ActivityType } from '../services/user-activities/user-activities.schema'
import { ObjectId } from 'mongodb'

export const trackUserActivity = (activityType: ActivityType, description?: string) => {
  return async (context: HookContext) => {
    // Only track for successful operations
    if (context.result) {
      try {
        const { app, params } = context
        const userActivityService = app.service('user-activities')

        // Get IP address from request
        const ipAddress = getClientIP(context)

        // Get user agent from headers
        const userAgent = params.headers?.['user-agent'] || 'Unknown'

        let userId: string | undefined
        let activityDescription = description || getDefaultDescription(activityType)

        // Determine user ID based on activity type and context
        if (activityType === ActivityType.LOGIN && context.result?.user) {
          userId = context.result.user._id || context.result.user.id
          activityDescription = `User logged in from ${ipAddress}`

          // Update user's lastLoggedIn timestamp
          if (userId) {
            try {
              const userService = app.service('users')
              await userService.patch(userId, {
                lastLoggedIn: new Date().toISOString()
              })
            } catch (error) {
              console.error('Failed to update user lastLoggedIn:', error)
            }
          }
        } else if (context.params.user) {
          userId = context.params.user._id || context.params.user.id
        }

        if (userId) {
          // Ensure all required fields are properly defined
          const activityData = {
            userId: new ObjectId(userId), // Ensure userId is a valid ObjectId
            type: activityType,
            description: activityDescription,
            ipAddress: ipAddress || '127.0.0.1',
            userAgent: userAgent || 'Unknown',
            createdAt: new Date().toISOString(), // Set createdAt since we're bypassing schema resolver
            metadata: {
              method: context.method || 'unknown',
              path: context.path || 'unknown',
              timestamp: new Date().toISOString()
            }
          }

          // Validate that all required fields are present and not null/undefined
          if (!activityData.userId || !activityData.type || !activityData.description) {
            console.error('Missing required activity data:', activityData)
            return context
          }

          // Create service call with minimal context to avoid schema issues
          await userActivityService.create(activityData, {
            internal: true // Mark as internal call to bypass authentication
          })
        }
      } catch (error) {
        // Don't fail the main operation if activity tracking fails
        console.error('Failed to track user activity:', error)
      }
    }

    return context
  }
}

// Helper function to get client IP address
const getClientIP = (context: HookContext): string => {
  const headers = context.params.headers || {}

  // First check if we extracted the IP in the before hook
  if (context.params.clientIp) {
    return context.params.clientIp
  }

  // Fallback to header extraction if clientIp not available
  const forwarded = headers['x-forwarded-for']
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded
    const ips = forwardedStr.split(',')
    return ips[0].trim()
  }

  const realIp = headers['x-real-ip']
  if (realIp) {
    const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp
    return realIpStr
  }

  const connectionIp = context.params.connection?.remoteAddress
  if (connectionIp) {
    return connectionIp
  }

  return '127.0.0.1'
}

// Helper function to get default descriptions
const getDefaultDescription = (activityType: ActivityType): string => {
  switch (activityType) {
    case ActivityType.LOGIN:
      return 'User logged in'
    case ActivityType.LOGOUT:
      return 'User logged out'
    case ActivityType.FAILED_LOGIN:
      return 'Failed login attempt'
    case ActivityType.PROFILE_UPDATE:
      return 'User updated profile'
    case ActivityType.PASSWORD_CHANGE:
      return 'User changed password'
    default:
      return 'User activity'
  }
}
