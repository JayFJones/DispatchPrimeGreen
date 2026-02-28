// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  fleetStatusDataValidator,
  fleetStatusPatchValidator,
  fleetStatusQueryValidator,
  fleetStatusResolver,
  fleetStatusExternalResolver,
  fleetStatusDataResolver,
  fleetStatusPatchResolver,
  fleetStatusQueryResolver
} from './fleet-status.schema'

import type { Application } from '../../declarations'
import { FleetStatusService, getOptions } from './fleet-status.class'
import { fleetStatusPath, fleetStatusMethods } from './fleet-status.shared'

export * from './fleet-status.class'
export * from './fleet-status.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const fleetStatus = (app: Application) => {
  // Register our service on the Feathers application
  const fleetStatusService = new FleetStatusService(getOptions(app), app)
  ;(app as any).use(fleetStatusPath, fleetStatusService, {
    // A list of all methods this service exposes externally
    methods: fleetStatusMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  ;(app as any).service(fleetStatusPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(fleetStatusExternalResolver),
        schemaHooks.resolveResult(fleetStatusResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(fleetStatusQueryValidator),
        schemaHooks.resolveQuery(fleetStatusQueryResolver)
      ],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [
        schemaHooks.validateData(fleetStatusDataValidator),
        schemaHooks.resolveData(fleetStatusDataResolver)
      ],
      patch: [
        schemaHooks.validateData(fleetStatusPatchValidator),
        schemaHooks.resolveData(fleetStatusPatchResolver)
      ],
      remove: [],
      // Custom methods require authentication
      getAvailableSnapshots: [authenticate('jwt')],
      getLatestFleetStatus: [authenticate('jwt')],
      getFleetStatusHistory: [authenticate('jwt')],
      getFleetStatusByTimeRange: [authenticate('jwt')],
      getFleetStatusBySnapshot: [authenticate('jwt')],
      getFleetStatusNearLocation: [authenticate('jwt')],
      getTripData: [authenticate('jwt')],
      clearTripCache: [authenticate('jwt')]
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}