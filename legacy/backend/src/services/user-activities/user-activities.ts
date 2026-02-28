// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  userActivityDataValidator,
  userActivityPatchValidator,
  userActivityQueryValidator,
  userActivityResolver,
  userActivityExternalResolver,
  userActivityDataResolver,
  userActivityPatchResolver,
  userActivityQueryResolver,
  ActivityType
} from './user-activities.schema'

import type { Application } from '../../declarations'
import { UserActivityService, getOptions } from './user-activities.class'
import { userActivityPath, userActivityMethods } from './user-activities.shared'
import { UserRole } from '../users/users.schema'

export * from './user-activities.class'
export * from './user-activities.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const userActivity = (app: Application) => {
  // Register our service on the Feathers application
  app.use(userActivityPath, new UserActivityService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: userActivityMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(userActivityPath).hooks({
    around: {
      all: [
        // Skip schema resolvers for internal calls
        async (context, next) => {
          if (context.params.internal) {
            // For internal calls, just proceed without schema resolution
            return await next()
          } else {
            // For external calls, apply schema resolvers
            return await schemaHooks.resolveExternal(userActivityExternalResolver)(context, async () => {
              return await schemaHooks.resolveResult(userActivityResolver)(context, next)
            })
          }
        }
      ],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [
        // Allow internal calls without authentication (for activity tracking)
        async (context, next) => {
          if (context.params.internal) {
            return await next()
          } else {
            return await authenticate('jwt')(context, next)
          }
        }
      ],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')]
    },
    before: {
      all: [],
      find: [
        // User filtering hook - must come before query validation
        async context => {
          if (context.params.user) {
            const currentUser = context.params.user
            const isAdmin = currentUser.roles && currentUser.roles.includes(UserRole.ADMIN)
            const isAdminView = context.params.query?.adminView === true

            if (isAdmin && isAdminView) {
              // For admin users in admin panel, completely remove userId constraints
              if (context.params.query) {
                delete context.params.query.userId
                delete context.params.query.adminView // Remove the flag from the query
                // Set a flag to skip userId query resolution
                ;(context.params as any).skipUserIdQuery = true
              }
            } else {
              // For non-admin users OR admin users on their profile page, filter to only their activities
              if (!context.params.query) {
                context.params.query = {}
              }
              // Remove the adminView flag if it exists
              delete context.params.query.adminView

              // Use $or to get both:
              // 1. Activities with the user's ID (successful logins, profile updates, etc.)
              // 2. Failed login attempts with the user's email (no userId but metadata.email matches)
              ;(context.params.query as any).$or = [
                { userId: currentUser._id },
                {
                  type: ActivityType.FAILED_LOGIN,
                  'metadata.email': currentUser.email
                }
              ]

              // Set a flag to skip query validation since we're using custom $or with metadata
              ;(context.params as any).skipQueryValidation = true
            }
          }
          return context
        },
        // Conditional query validation
        async context => {
          if (!(context.params as any).skipQueryValidation) {
            await schemaHooks.validateQuery(userActivityQueryValidator)(context)
          }
          return context
        },
        schemaHooks.resolveQuery(userActivityQueryResolver)
      ],
      get: [
        schemaHooks.validateQuery(userActivityQueryValidator),
        schemaHooks.resolveQuery(userActivityQueryResolver)
      ],
      create: [
        // Skip schema validation for internal calls (activity tracking) but ensure createdAt is set
        async context => {
          if (!context.params.internal) {
            await schemaHooks.validateData(userActivityDataValidator)(context)
            await schemaHooks.resolveData(userActivityDataResolver)(context)
          } else {
            // For internal calls, still apply the data resolver to ensure createdAt is set
            await schemaHooks.resolveData(userActivityDataResolver)(context)
          }
          return context
        }
      ],
      patch: [
        schemaHooks.validateData(userActivityPatchValidator),
        schemaHooks.resolveData(userActivityPatchResolver)
      ],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [userActivityPath]: UserActivityService
  }
}
