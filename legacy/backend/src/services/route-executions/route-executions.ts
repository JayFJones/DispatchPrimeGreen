// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  routeExecutionDataValidator,
  routeExecutionPatchValidator,
  routeExecutionQueryValidator,
  routeExecutionResolver,
  routeExecutionExternalResolver,
  routeExecutionDataResolver,
  routeExecutionPatchResolver,
  routeExecutionQueryResolver
} from './route-executions.schema'

import type { Application } from '../../declarations'
import { RouteExecutionService, getOptions } from './route-executions.class'
import { routeExecutionPath, routeExecutionMethods } from './route-executions.shared'
import { 
  validateRouteExecution, 
  populateInitialStops, 
  calculatePerformanceMetrics, 
  updateExecutionStatus,
  integrateGeotabData
} from './route-executions-hooks'

export * from './route-executions.class'
export * from './route-executions.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const routeExecution = (app: Application) => {
  // Register our service on the Feathers application
  app.use(routeExecutionPath, new RouteExecutionService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: routeExecutionMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(routeExecutionPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(routeExecutionExternalResolver), schemaHooks.resolveResult(routeExecutionResolver)],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [authenticate('jwt')],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')]
    },
    before: {
      all: [schemaHooks.validateQuery(routeExecutionQueryValidator), schemaHooks.resolveQuery(routeExecutionQueryResolver)],
      find: [],
      get: [],
      create: [
        validateRouteExecution, 
        populateInitialStops,
        schemaHooks.validateData(routeExecutionDataValidator), 
        schemaHooks.resolveData(routeExecutionDataResolver)
      ],
      patch: [schemaHooks.validateData(routeExecutionPatchValidator), schemaHooks.resolveData(routeExecutionPatchResolver)],
      remove: []
    },
    after: {
      all: [],
      find: [],
      get: [],
      create: [updateExecutionStatus],
      patch: [calculatePerformanceMetrics, updateExecutionStatus] // integrateGeotabData temporarily disabled
    },
    error: {
      all: [(context: any) => {
        console.error('[ROUTE-EXECUTIONS] Service error occurred:', context.error)
        console.error('[ROUTE-EXECUTIONS] Error details:', JSON.stringify(context.error, null, 2))
        console.error('[ROUTE-EXECUTIONS] Method:', context.method)
        console.error('[ROUTE-EXECUTIONS] Data:', context.data)
        // Rethrow the error to ensure it reaches the client
        throw context.error
      }]
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [routeExecutionPath]: RouteExecutionService
  }
}