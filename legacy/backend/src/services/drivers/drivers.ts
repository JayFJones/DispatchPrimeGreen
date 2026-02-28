// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  driverDataValidator,
  driverPatchValidator,
  driverQueryValidator,
  driverResolver,
  driverExternalResolver,
  driverDataResolver,
  driverPatchResolver,
  driverQueryResolver
} from './drivers.schema'

import type { Application } from '../../declarations'
import { DriverService, getOptions } from './drivers.class'
import { driverPath, driverMethods } from './drivers.shared'

export * from './drivers.class'
export * from './drivers.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const driver = (app: Application) => {
  // Register our service on the Feathers application
  app.use(driverPath, new DriverService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: driverMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(driverPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(driverExternalResolver),
        schemaHooks.resolveResult(driverResolver)
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
        schemaHooks.validateQuery(driverQueryValidator),
        schemaHooks.resolveQuery(driverQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(driverDataValidator),
        schemaHooks.resolveData(driverDataResolver)
      ],
      patch: [
        schemaHooks.validateData(driverPatchValidator),
        schemaHooks.resolveData(driverPatchResolver)
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
    [driverPath]: DriverService
  }
}