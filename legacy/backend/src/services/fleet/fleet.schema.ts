// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import { ObjectIdSchema } from '@feathersjs/typebox'

// Main data model schema
export const fleetSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    truckID: Type.String(),
    terminalId: Type.Optional(ObjectIdSchema()),
    vin: Type.Optional(Type.String()),
    licensePlate: Type.Optional(Type.String()),
    licenseState: Type.Optional(Type.String()),
    odometer: Type.Optional(Type.Number()),
    lastLocationLatitude: Type.Optional(Type.Number()),
    lastLocationLongitude: Type.Optional(Type.Number()),
    vehicleType: Type.Union([
      Type.Literal('ST'), // Straight truck
      Type.Literal('TT'), // Tractor trailer
      Type.Literal('??')  // Unknown vehicle type from Geotab
    ]),
    lastLocationUpdated: Type.Optional(Type.String()),
    status: Type.Union([
      Type.Literal('active'),
      Type.Literal('inactive'),
      Type.Literal('maintenance'),
      Type.Literal('out-of-service')
    ]),
    notes: Type.Optional(Type.String()),
    groups: Type.Optional(Type.Array(Type.String())), // Array of GEOtab group IDs that this vehicle belongs to
    createdAt: Type.Number(),
    updatedAt: Type.Number()
  },
  { $id: 'Fleet', additionalProperties: false }
)
export type Fleet = Static<typeof fleetSchema>
export const fleetValidator = getValidator(fleetSchema, dataValidator)
export const fleetResolver = resolve<Fleet, HookContext>({})

export const fleetExternalResolver = resolve<Fleet, HookContext>({})

// Schema for creating new entries
export const fleetDataSchema = Type.Pick(fleetSchema, [
  'truckID',
  'terminalId',
  'vin',
  'licensePlate',
  'licenseState',
  'odometer',
  'lastLocationLatitude',
  'lastLocationLongitude',
  'vehicleType',
  'lastLocationUpdated',
  'status',
  'notes',
  'groups'
], {
  $id: 'FleetData'
})
export type FleetData = Static<typeof fleetDataSchema>
export const fleetDataValidator = getValidator(fleetDataSchema, dataValidator)
export const fleetDataResolver = resolve<Fleet, HookContext>({
  createdAt: async () => {
    return Date.now()
  },
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for updating entries
export const fleetPatchSchema = Type.Partial(fleetSchema, {
  $id: 'FleetPatch'
})
export type FleetPatch = Static<typeof fleetPatchSchema>
export const fleetPatchValidator = getValidator(fleetPatchSchema, dataValidator)
export const fleetPatchResolver = resolve<Fleet, HookContext>({
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for allowed query properties
export const fleetQueryProperties = Type.Pick(fleetSchema, [
  '_id',
  'truckID',
  'terminalId',
  'vin',
  'licensePlate',
  'licenseState',
  'odometer',
  'lastLocationLatitude',
  'lastLocationLongitude',
  'vehicleType',
  'lastLocationUpdated',
  'status',
  'notes',
  'groups',
  'createdAt',
  'updatedAt'
])
export const fleetQuerySchema = Type.Intersect(
  [
    querySyntax(fleetQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type FleetQuery = Static<typeof fleetQuerySchema>
export const fleetQueryValidator = getValidator(fleetQuerySchema, queryValidator)
export const fleetQueryResolver = resolve<FleetQuery, HookContext>({})