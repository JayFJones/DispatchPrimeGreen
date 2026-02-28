// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  customerDataValidator,
  customerPatchValidator,
  customerQueryValidator,
  customerResolver,
  customerExternalResolver,
  customerDataResolver,
  customerPatchResolver,
  customerQueryResolver
} from './customers.schema'

import type { Application } from '../../declarations'
import { CustomerService, getOptions } from './customers.class'
import { customerPath, customerMethods } from './customers.shared'

export * from './customers.class'
export * from './customers.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const customer = (app: Application) => {
  // Register our service on the Feathers application
  app.use(customerPath, new CustomerService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: customerMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(customerPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(customerExternalResolver),
        schemaHooks.resolveResult(customerResolver)
      ],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [authenticate('jwt')],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')]
    },
    before: {
      all: [
        schemaHooks.validateQuery(customerQueryValidator),
        schemaHooks.resolveQuery(customerQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(customerDataValidator),
        schemaHooks.resolveData(customerDataResolver)
      ],
      patch: [
        schemaHooks.validateData(customerPatchValidator),
        schemaHooks.resolveData(customerPatchResolver)
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
    [customerPath]: CustomerService
  }
}
