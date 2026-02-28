// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import {
  adminActionValidator,
  adminActionResolver,
  adminResponseResolver,
  adminResponseExternalResolver
} from './admin.schema'

import type { Application } from '../../declarations'
import { AdminService, getOptions } from './admin.class'
import { adminPath, adminMethods } from './admin.shared'

export * from './admin.class'
export * from './admin.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const admin = (app: Application) => {
  // Register our service on the Feathers application
  app.use(adminPath, new AdminService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: adminMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  const service = app.service(adminPath)
  service.hooks({
    before: {
      all: [authenticate('jwt')],
      create: [
        // Temporarily remove validation to test
        // adminActionValidator,
        // adminActionResolver
      ]
    },
    after: {
      all: [],
      create: [] // Temporarily remove response resolver
    },
    error: {
      all: [
        (context: any) => {
          console.error('Admin service error:', context.error)
          return context
        }
      ]
    }
  })
}
