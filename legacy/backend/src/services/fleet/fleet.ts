// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  fleetDataValidator,
  fleetPatchValidator,
  fleetQueryValidator,
  fleetResolver,
  fleetExternalResolver,
  fleetDataResolver,
  fleetPatchResolver,
  fleetQueryResolver
} from './fleet.schema'

import type { Application } from '../../declarations'
import { FleetService, getOptions } from './fleet.class'
import { fleetPath, fleetMethods } from './fleet.shared'

export * from './fleet.class'
export * from './fleet.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const fleet = (app: Application) => {
  // Register our service on the Feathers application
  app.use(fleetPath, new FleetService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: fleetMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(fleetPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(fleetExternalResolver),
        schemaHooks.resolveResult(fleetResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(fleetQueryValidator),
        schemaHooks.resolveQuery(fleetQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(fleetDataValidator),
        schemaHooks.resolveData(fleetDataResolver)
      ],
      patch: [
        schemaHooks.validateData(fleetPatchValidator),
        schemaHooks.resolveData(fleetPatchResolver)
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
    [fleetPath]: FleetService
  }
}