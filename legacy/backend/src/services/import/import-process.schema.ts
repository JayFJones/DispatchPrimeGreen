import { resolve } from '@feathersjs/schema'
import { Type, getValidator } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator } from '../../validators'
import type { ImportProcessService } from './import-process.class'

// Schema for import process requests
export const importProcessDataSchema = Type.Object(
  {
    fileData: Type.String(), // Base64 encoded file data
    fileName: Type.String(),
    importType: Type.String()
  },
  { $id: 'ImportProcessData' }
)
export type ImportProcessData = Static<typeof importProcessDataSchema>
export const importProcessDataValidator = getValidator(importProcessDataSchema, dataValidator)

// Schema for import process response
export const importProcessSchema = Type.Object(
  {
    _id: Type.String(),
    success: Type.Boolean(),
    message: Type.String(),
    summary: Type.Object({
      terminalsProcessed: Type.Number(),
      customersProcessed: Type.Number(),
      routesProcessed: Type.Number(),
      routeStopsProcessed: Type.Number(),
      terminalsUpdated: Type.Optional(Type.Number()),
      driversProcessed: Type.Optional(Type.Number()),
      equipmentProcessed: Type.Optional(Type.Number()),
      unmatchedRoutes: Type.Optional(Type.Number()),
      unmatchedDrivers: Type.Optional(Type.Number()),
      unmatchedTerminals: Type.Optional(Type.Number()),
      unmatchedBenchDrivers: Type.Optional(Type.Number()),
      totalRows: Type.Number()
    }),
    warnings: Type.Array(
      Type.Object({
        row: Type.Number(),
        message: Type.String(),
        data: Type.String()
      })
    ),
    createdAt: Type.String({ format: 'date-time' })
  },
  { $id: 'ImportProcess', additionalProperties: false }
)
export type ImportProcess = Static<typeof importProcessSchema>
export const importProcessValidator = getValidator(importProcessSchema, dataValidator)
export const importProcessResolver = resolve<ImportProcess, HookContext<ImportProcessService>>({})

export const importProcessExternalResolver = resolve<ImportProcess, HookContext<ImportProcessService>>({})

export const importProcessDataResolver = resolve<ImportProcess, HookContext<ImportProcessService>>({
  _id: async () => new Date().getTime().toString(),
  createdAt: async () => new Date().toISOString()
})
