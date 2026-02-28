// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  equipmentDataValidator,
  equipmentPatchValidator,
  equipmentQueryValidator,
  equipmentResolver,
  equipmentExternalResolver,
  equipmentDataResolver,
  equipmentPatchResolver,
  equipmentQueryResolver
} from './equipment.schema'

import type { Application } from '../../declarations'
import { EquipmentService } from './equipment.class'

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('equipment'))
  }
}
import { equipmentPath, equipmentMethods } from './equipment.shared'

export * from './equipment.class'
export * from './equipment.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const equipment = (app: Application) => {
  // Register our service on the Feathers application
  app.use(equipmentPath, new EquipmentService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: equipmentMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(equipmentPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(equipmentExternalResolver),
        schemaHooks.resolveResult(equipmentResolver)
      ]
    },
    before: {
      all: [schemaHooks.validateQuery(equipmentQueryValidator), schemaHooks.resolveQuery(equipmentQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(equipmentDataValidator), schemaHooks.resolveData(equipmentDataResolver)],
      patch: [schemaHooks.validateData(equipmentPatchValidator), schemaHooks.resolveData(equipmentPatchResolver)],
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
    [equipmentPath]: EquipmentService
  }
}