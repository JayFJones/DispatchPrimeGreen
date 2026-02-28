// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  historyDataValidator,
  historyPatchValidator,
  historyQueryValidator,
  historyResolver,
  historyExternalResolver,
  historyDataResolver,
  historyPatchResolver,
  historyQueryResolver
} from './history.schema'

import type { Application } from '../../declarations'
import { HistoryService } from './history.class'

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('history'))
  }
}
import { historyPath, historyMethods } from './history.shared'

export * from './history.class'
export * from './history.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const history = (app: Application) => {
  // Register our service on the Feathers application
  app.use(historyPath, new HistoryService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: historyMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(historyPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(historyExternalResolver),
        schemaHooks.resolveResult(historyResolver)
      ]
    },
    before: {
      all: [schemaHooks.validateQuery(historyQueryValidator), schemaHooks.resolveQuery(historyQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(historyDataValidator), schemaHooks.resolveData(historyDataResolver)],
      patch: [schemaHooks.validateData(historyPatchValidator), schemaHooks.resolveData(historyPatchResolver)],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: [(context: any) => {
        console.error('[HISTORY-SERVICE] Error in history service:')
        console.error('[HISTORY-SERVICE] Method:', context.method)
        console.error('[HISTORY-SERVICE] Error:', context.error)
        console.error('[HISTORY-SERVICE] Query:', context.params?.query)
        console.error('[HISTORY-SERVICE] Data:', context.data)
        
        // Always rethrow the error to ensure it reaches the client
        throw context.error
      }]
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [historyPath]: HistoryService
  }
}