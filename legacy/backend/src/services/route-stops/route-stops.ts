// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  routeStopDataValidator,
  routeStopPatchValidator,
  routeStopQueryValidator,
  routeStopResolver,
  routeStopExternalResolver,
  routeStopDataResolver,
  routeStopPatchResolver,
  routeStopQueryResolver
} from './route-stops.schema'

import type { Application } from '../../declarations'
import { RouteStopService, getOptions } from './route-stops.class'
import { routeStopPath, routeStopMethods } from './route-stops.shared'

export * from './route-stops.class'
export * from './route-stops.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const routeStop = (app: Application) => {
  // Register our service on the Feathers application
  app.use(routeStopPath, new RouteStopService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: routeStopMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(routeStopPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(routeStopExternalResolver),
        schemaHooks.resolveResult(routeStopResolver)
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
        schemaHooks.validateQuery(routeStopQueryValidator),
        schemaHooks.resolveQuery(routeStopQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(routeStopDataValidator),
        schemaHooks.resolveData(routeStopDataResolver)
      ],
      patch: [
        schemaHooks.validateData(routeStopPatchValidator),
        schemaHooks.resolveData(routeStopPatchResolver)
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
    [routeStopPath]: RouteStopService
  }
}
