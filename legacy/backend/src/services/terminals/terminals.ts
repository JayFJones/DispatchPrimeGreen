// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  terminalDataValidator,
  terminalPatchValidator,
  terminalQueryValidator,
  terminalResolver,
  terminalExternalResolver,
  terminalDataResolver,
  terminalPatchResolver,
  terminalQueryResolver
} from './terminals.schema'

import type { Application } from '../../declarations'
import { TerminalService, getOptions } from './terminals.class'
import { terminalPath, terminalMethods } from './terminals.shared'

export * from './terminals.class'
export * from './terminals.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const terminal = (app: Application) => {
  // Register our service on the Feathers application
  app.use(terminalPath, new TerminalService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: terminalMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(terminalPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(terminalExternalResolver),
        schemaHooks.resolveResult(terminalResolver)
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
        schemaHooks.validateQuery(terminalQueryValidator),
        schemaHooks.resolveQuery(terminalQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(terminalDataValidator),
        schemaHooks.resolveData(terminalDataResolver)
      ],
      patch: [
        schemaHooks.validateData(terminalPatchValidator),
        schemaHooks.resolveData(terminalPatchResolver)
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
    [terminalPath]: TerminalService
  }
}
