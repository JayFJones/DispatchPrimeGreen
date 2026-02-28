// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { feathers } from '@feathersjs/feathers'
import configuration from '@feathersjs/configuration'
import { koa, rest, bodyParser, errorHandler, parseAuthentication, cors, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'

import { configurationValidator } from './configuration'
import type { Application } from './declarations'
import { logError } from './hooks/log-error'
import { mongodb } from './mongodb'
import { authentication } from './authentication'
import { services } from './services/index'
import { channels } from './channels'

const app: Application = koa(feathers())

// Load our app configuration (see config/ folder)
app.configure(configuration(configurationValidator))

// Configure proxy trust for IP address extraction
app.proxy = true

// Add IP address extraction middleware
app.use(async (ctx, next) => {
  // Extract real IP address and store in state
  const forwarded = ctx.headers['x-forwarded-for']
  if (forwarded) {
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded
    ctx.state.realIp = forwardedStr.split(',')[0].trim()
  } else {
    const realIp = ctx.headers['x-real-ip']
    const cfIp = ctx.headers['cf-connecting-ip']
    const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp
    const cfIpStr = Array.isArray(cfIp) ? cfIp[0] : cfIp

    ctx.state.realIp = realIpStr || cfIpStr || ctx.request.ip || ctx.socket?.remoteAddress || '127.0.0.1'
  }
  await next()
})

// Set up Koa middleware
app.use(
  cors({
    origin: '*'
  })
)
app.use(serveStatic(app.get('public')))
app.use(errorHandler())
app.use(parseAuthentication())
app.use(bodyParser())

// Configure services and transports
app.configure(rest())
app.configure(
  socketio({
    cors: {
      origin: '*'
    }
  })
)
app.configure(mongodb)
app.configure(authentication)
app.configure(services)
app.configure(channels)

// Register hooks that run on all service methods
app.hooks({
  around: {
    all: [logError]
  },
  before: {},
  after: {},
  error: {
    all: [(context: any) => {
      console.error('[APP-GLOBAL-ERROR] Global error handler caught error:')
      console.error('[APP-GLOBAL-ERROR] Service:', context.path)
      console.error('[APP-GLOBAL-ERROR] Method:', context.method)
      console.error('[APP-GLOBAL-ERROR] Error type:', context.error?.name)
      console.error('[APP-GLOBAL-ERROR] Error message:', context.error?.message)
      console.error('[APP-GLOBAL-ERROR] Error data:', context.error?.data)
      console.error('[APP-GLOBAL-ERROR] Full error:', context.error)
      console.error('[APP-GLOBAL-ERROR] Request data:', context.data)
      console.error('[APP-GLOBAL-ERROR] Query params:', context.params?.query)
      console.error('[APP-GLOBAL-ERROR] Stack trace:', context.error?.stack)
      
      // For schema validation errors, create a more user-friendly error message
      if (context.error?.message === 'validation failed' && context.error?.data) {
        const validationErrors = context.error.data
        const errorDetails = validationErrors.map((err: any) => 
          `${err.params?.additionalProperty || 'field'}: ${err.message}`
        ).join(', ')
        
        console.error('[APP-GLOBAL-ERROR] Validation error details:', errorDetails)
        
        // Create a more specific error message for the client
        const enhancedError = new Error(`Validation failed in ${context.path} service: ${errorDetails}`)
        enhancedError.name = 'ValidationError'
        ;(enhancedError as any).code = 400
        ;(enhancedError as any).className = 'bad-request'
        ;(enhancedError as any).data = context.error.data
        
        throw enhancedError
      }
      
      // Always rethrow to ensure error reaches client
      throw context.error
    }]
  }
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

export { app }
