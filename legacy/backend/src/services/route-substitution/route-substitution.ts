// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  routeSubstitutionDataValidator,
  routeSubstitutionPatchValidator,
  routeSubstitutionQueryValidator,
  routeSubstitutionResolver,
  routeSubstitutionExternalResolver,
  routeSubstitutionDataResolver,
  routeSubstitutionPatchResolver,
  routeSubstitutionQueryResolver
} from './route-substitution.schema'

import type { Application } from '../../declarations'
import { RouteSubstitutionService, getOptions } from './route-substitution.class'
import { routeSubstitutionPath, routeSubstitutionMethods } from './route-substitution.shared'

export * from './route-substitution.class'
export * from './route-substitution.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const routeSubstitution = (app: Application) => {
  // Register our service on the Feathers application
  app.use(routeSubstitutionPath, new RouteSubstitutionService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: routeSubstitutionMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(routeSubstitutionPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(routeSubstitutionExternalResolver),
        schemaHooks.resolveResult(routeSubstitutionResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(routeSubstitutionQueryValidator),
        schemaHooks.resolveQuery(routeSubstitutionQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(routeSubstitutionDataValidator),
        schemaHooks.resolveData(routeSubstitutionDataResolver)
      ],
      patch: [
        schemaHooks.validateData(routeSubstitutionPatchValidator),
        schemaHooks.resolveData(routeSubstitutionPatchResolver)
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
    [routeSubstitutionPath]: RouteSubstitutionService
  }
}