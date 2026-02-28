// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  dispatchedRouteDataValidator,
  dispatchedRoutePatchValidator,
  dispatchedRouteQueryValidator,
  dispatchedRouteResolver,
  dispatchedRouteExternalResolver,
  dispatchedRouteDataResolver,
  dispatchedRoutePatchResolver,
  dispatchedRouteQueryResolver
} from './dispatched-routes.schema'

import type { Application } from '../../declarations'
import { DispatchedRouteService, getOptions } from './dispatched-routes.class'
import { dispatchedRoutePath, dispatchedRouteMethods } from './dispatched-routes.shared'

export * from './dispatched-routes.class'
export * from './dispatched-routes.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const dispatchedRoute = (app: Application) => {
  // Register our service on the Feathers application
  app.use(dispatchedRoutePath, new DispatchedRouteService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: dispatchedRouteMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(dispatchedRoutePath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(dispatchedRouteExternalResolver), schemaHooks.resolveResult(dispatchedRouteResolver)],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [authenticate('jwt')],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')]
    },
    before: {
      all: [schemaHooks.validateQuery(dispatchedRouteQueryValidator), schemaHooks.resolveQuery(dispatchedRouteQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(dispatchedRouteDataValidator), schemaHooks.resolveData(dispatchedRouteDataResolver)],
      patch: [schemaHooks.validateData(dispatchedRoutePatchValidator), schemaHooks.resolveData(dispatchedRoutePatchResolver)],
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
    [dispatchedRoutePath]: DispatchedRouteService
  }
}