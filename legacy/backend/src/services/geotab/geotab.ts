// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  geotabDataValidator,
  geotabPatchValidator,
  geotabQueryValidator,
  geotabResolver,
  geotabExternalResolver,
  geotabDataResolver,
  geotabPatchResolver,
  geotabQueryResolver,
  geotabAuthValidator
} from './geotab.schema'

import type { Application } from '../../declarations'
import { GeotabService, getOptions } from './geotab.class'
import { geotabPath, geotabMethods } from './geotab.shared'

export * from './geotab.class'
export * from './geotab.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const geotab = (app: Application) => {
  // Register our service on the Feathers application
  app.use(geotabPath, new GeotabService(getOptions(app), app), {
    // A list of all methods this service exposes externally
    methods: geotabMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(geotabPath).hooks({
    around: {
      all: [
        authenticate('jwt')
      ],
      find: [
        schemaHooks.resolveExternal(geotabExternalResolver),
        schemaHooks.resolveResult(geotabResolver)
      ],
      get: [
        schemaHooks.resolveExternal(geotabExternalResolver),
        schemaHooks.resolveResult(geotabResolver)
      ],
      create: [
        schemaHooks.resolveExternal(geotabExternalResolver),
        schemaHooks.resolveResult(geotabResolver)
      ],
      patch: [
        schemaHooks.resolveExternal(geotabExternalResolver),
        schemaHooks.resolveResult(geotabResolver)
      ],
      remove: [
        schemaHooks.resolveExternal(geotabExternalResolver),
        schemaHooks.resolveResult(geotabResolver)
      ]
    },
    before: {
      find: [
        schemaHooks.validateQuery(geotabQueryValidator),
        schemaHooks.resolveQuery(geotabQueryResolver)
      ],
      get: [
        schemaHooks.validateQuery(geotabQueryValidator),
        schemaHooks.resolveQuery(geotabQueryResolver)
      ],
      create: [
        schemaHooks.validateData(geotabDataValidator),
        schemaHooks.resolveData(geotabDataResolver)
      ],
      patch: [
        schemaHooks.validateData(geotabPatchValidator),
        schemaHooks.resolveData(geotabPatchResolver)
      ],
      remove: [],
      authenticate: [
        schemaHooks.validateData(geotabAuthValidator)
      ],
      getAuthStatus: [],
      isSessionValid: [],
      logout: [],
      testConnection: [],
      getDevices: [
        schemaHooks.validateData(geotabAuthValidator)
      ],
      getRealTimeFleetInfo: [
        schemaHooks.validateData(geotabAuthValidator)
      ],
      getRouteProgress: [
        schemaHooks.validateData(geotabAuthValidator)
      ],
      getFleetRouteStatus: [
        schemaHooks.validateData(geotabAuthValidator)
      ],
      getTripData: [],
      clearTripCache: [],
      getDriverData: [],
      clearDriverCache: [],
      getDeviceData: [],
      clearDeviceCache: [],
      getGroupData: [],
      clearGroupCache: [],
      updateDatabaseGroups: []
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
    [geotabPath]: GeotabService
  }
}