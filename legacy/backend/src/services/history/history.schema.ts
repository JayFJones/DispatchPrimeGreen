// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import { ObjectIdSchema } from '@feathersjs/typebox'

// Main data model schema
export const historySchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    historyType: Type.Union([
      Type.Literal('availability'),
      Type.Literal('customer_contact'),
      Type.Literal('route_change'),
      Type.Literal('truck_maintenance'),
      Type.Literal('driver_contact'),
      Type.Literal('system_change')
    ]),
    entityType: Type.Union([
      Type.Literal('driver'),
      Type.Literal('customer'),
      Type.Literal('route'),
      Type.Literal('truck'),
      Type.Literal('terminal'),
      Type.Literal('system')
    ]),
    entityId: Type.Optional(ObjectIdSchema()),
    timestamp: Type.String({ format: 'date-time' }),
    userId: Type.Optional(ObjectIdSchema()),
    userEmail: Type.Optional(Type.String()),
    summary: Type.String(),
    data: Type.Record(Type.String(), Type.Any()),
    notes: Type.Optional(Type.String()),
    createdAt: Type.Number(),
    updatedAt: Type.Number()
  },
  { $id: 'History', additionalProperties: false }
)
export type History = Static<typeof historySchema>
export const historyValidator = getValidator(historySchema, dataValidator)
export const historyResolver = resolve<History, HookContext>({})

export const historyExternalResolver = resolve<History, HookContext>({})

// Schema for creating new entries
export const historyDataSchema = Type.Pick(historySchema, [
  'historyType',
  'entityType',
  'entityId',
  'timestamp',
  'userId',
  'userEmail',
  'summary',
  'data',
  'notes'
], {
  $id: 'HistoryData'
})
export type HistoryData = Static<typeof historyDataSchema>
export const historyDataValidator = getValidator(historyDataSchema, dataValidator)
export const historyDataResolver = resolve<History, HookContext>({
  createdAt: async () => {
    return Date.now()
  },
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for updating entries
export const historyPatchSchema = Type.Partial(historySchema, {
  $id: 'HistoryPatch'
})
export type HistoryPatch = Static<typeof historyPatchSchema>
export const historyPatchValidator = getValidator(historyPatchSchema, dataValidator)
export const historyPatchResolver = resolve<History, HookContext>({
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for allowed query properties
export const historyQueryProperties = Type.Pick(historySchema, [
  '_id',
  'historyType',
  'entityType',
  'entityId',
  'timestamp',
  'userId',
  'userEmail',
  'summary',
  'notes',
  'createdAt',
  'updatedAt'
])
export const historyQuerySchema = Type.Intersect(
  [
    querySyntax(historyQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type HistoryQuery = Static<typeof historyQuerySchema>
export const historyQueryValidator = getValidator(historyQuerySchema, queryValidator)
export const historyQueryResolver = resolve<HistoryQuery, HookContext>({})