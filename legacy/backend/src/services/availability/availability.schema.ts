// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import { ObjectIdSchema } from '@feathersjs/typebox'

// Main data model schema
export const availabilitySchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    driverId: ObjectIdSchema(), // Direct reference to driver _id
    startDate: Type.String({ format: 'date' }), // YYYY-MM-DD format
    endDate: Type.Optional(Type.String({ format: 'date' })), // Optional for ongoing availability
    availabilityType: Type.Union([
      Type.Literal('Available'),
      Type.Literal('Not Available'),
      Type.Literal('PTO'),
      Type.Literal('Vacation'),
      Type.Literal('Sick'),
      Type.Literal('Personal')
    ]),
    reason: Type.Optional(Type.String()), // Optional reason/notes
    notes: Type.Optional(Type.String()),
    userId: Type.Optional(ObjectIdSchema()), // User who created/updated
    createdAt: Type.Number(),
    updatedAt: Type.Number()
  },
  { $id: 'Availability', additionalProperties: false }
)
export type Availability = Static<typeof availabilitySchema>
export const availabilityValidator = getValidator(availabilitySchema, dataValidator)
export const availabilityResolver = resolve<Availability, HookContext>({})

export const availabilityExternalResolver = resolve<Availability, HookContext>({})

// Schema for creating new entries
export const availabilityDataSchema = Type.Pick(availabilitySchema, [
  'driverId',
  'startDate',
  'endDate',
  'availabilityType',
  'reason',
  'notes',
  'userId'
], {
  $id: 'AvailabilityData'
})
export type AvailabilityData = Static<typeof availabilityDataSchema>
export const availabilityDataValidator = getValidator(availabilityDataSchema, dataValidator)
export const availabilityDataResolver = resolve<Availability, HookContext>({
  createdAt: async () => {
    return Date.now()
  },
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for updating entries
export const availabilityPatchSchema = Type.Partial(availabilitySchema, {
  $id: 'AvailabilityPatch'
})
export type AvailabilityPatch = Static<typeof availabilityPatchSchema>
export const availabilityPatchValidator = getValidator(availabilityPatchSchema, dataValidator)
export const availabilityPatchResolver = resolve<Availability, HookContext>({
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for allowed query properties
export const availabilityQueryProperties = Type.Pick(availabilitySchema, [
  '_id',
  'driverId',
  'startDate',
  'endDate',
  'availabilityType',
  'reason',
  'notes',
  'userId',
  'createdAt',
  'updatedAt'
])
export const availabilityQuerySchema = Type.Intersect(
  [
    querySyntax(availabilityQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type AvailabilityQuery = Static<typeof availabilityQuerySchema>
export const availabilityQueryValidator = getValidator(availabilityQuerySchema, queryValidator)
export const availabilityQueryResolver = resolve<AvailabilityQuery, HookContext>({})