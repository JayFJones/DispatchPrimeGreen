// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  routeDataValidator,
  routePatchValidator,
  routeQueryValidator,
  routeResolver,
  routeExternalResolver,
  routeDataResolver,
  routePatchResolver,
  routeQueryResolver
} from './routes.schema'

import type { Application } from '../../declarations'
import { RouteService, getOptions } from './routes.class'
import { routePath, routeMethods } from './routes.shared'
import { populateRouteData } from './routes-hooks'

export * from './routes.class'
export * from './routes.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const route = (app: Application) => {
  // Register our service on the Feathers application
  app.use(routePath, new RouteService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: routeMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(routePath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(routeExternalResolver), schemaHooks.resolveResult(routeResolver)],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [authenticate('jwt')],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')]
    },
    before: {
      all: [schemaHooks.validateQuery(routeQueryValidator), schemaHooks.resolveQuery(routeQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(routeDataValidator), schemaHooks.resolveData(routeDataResolver)],
      patch: [schemaHooks.validateData(routePatchValidator), schemaHooks.resolveData(routePatchResolver)],
      remove: []
    },
    after: {
      all: [],
      find: [populateRouteData],
      get: [populateRouteData]
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [routePath]: RouteService
  }
}
