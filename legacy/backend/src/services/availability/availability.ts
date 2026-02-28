// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  availabilityDataValidator,
  availabilityPatchValidator,
  availabilityQueryValidator,
  availabilityResolver,
  availabilityExternalResolver,
  availabilityDataResolver,
  availabilityPatchResolver,
  availabilityQueryResolver
} from './availability.schema'

import type { Application } from '../../declarations'
import { AvailabilityService } from './availability.class'

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('availability'))
  }
}
import { availabilityPath, availabilityMethods } from './availability.shared'

export * from './availability.class'
export * from './availability.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const availability = (app: Application) => {
  // Register our service on the Feathers application
  app.use(availabilityPath, new AvailabilityService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: availabilityMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(availabilityPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(availabilityExternalResolver),
        schemaHooks.resolveResult(availabilityResolver)
      ]
    },
    before: {
      all: [schemaHooks.validateQuery(availabilityQueryValidator), schemaHooks.resolveQuery(availabilityQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(availabilityDataValidator), schemaHooks.resolveData(availabilityDataResolver)],
      patch: [schemaHooks.validateData(availabilityPatchValidator), schemaHooks.resolveData(availabilityPatchResolver)],
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
    [availabilityPath]: AvailabilityService
  }
}