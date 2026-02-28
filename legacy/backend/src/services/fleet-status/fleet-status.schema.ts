// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { FleetStatusService } from './fleet-status.class'

// Main data model schema
export const fleetStatusSchema = Type.Object(
  {
    _id: Type.Optional(Type.String()),
    deviceId: Type.String(),
    deviceName: Type.String(),
    latitude: Type.Optional(Type.Number()),
    longitude: Type.Optional(Type.Number()),
    speed: Type.Optional(Type.Number()),
    bearing: Type.Optional(Type.Number()),
    isDriving: Type.Boolean(),
    driverId: Type.Optional(Type.String()),
    driverInfo: Type.Optional(Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
      firstName: Type.Optional(Type.String()),
      lastName: Type.Optional(Type.String()),
      employeeNo: Type.Optional(Type.String())
    }, { additionalProperties: false })),
    responseTimestamp: Type.String({ format: 'date-time' }),
    recordedAt: Type.String({ format: 'date-time' }),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'FleetStatus', additionalProperties: false }
)
export type FleetStatus = Static<typeof fleetStatusSchema>
export const fleetStatusValidator = getValidator(fleetStatusSchema, dataValidator)
export const fleetStatusResolver = resolve<FleetStatus, HookContext<FleetStatusService>>({})

export const fleetStatusExternalResolver = resolve<FleetStatus, HookContext<FleetStatusService>>({})

// Schema for creating new entries
export const fleetStatusDataSchema = Type.Pick(fleetStatusSchema, [
  'deviceId',
  'deviceName',
  'latitude',
  'longitude',
  'speed',
  'bearing',
  'isDriving',
  'driverId',
  'driverInfo',
  'responseTimestamp',
  'recordedAt'
], {
  $id: 'FleetStatusData'
})
export type FleetStatusData = Static<typeof fleetStatusDataSchema>
export const fleetStatusDataValidator = getValidator(fleetStatusDataSchema, dataValidator)
export const fleetStatusDataResolver = resolve<FleetStatus, HookContext<FleetStatusService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const fleetStatusPatchSchema = Type.Partial(fleetStatusSchema, {
  $id: 'FleetStatusPatch'
})
export type FleetStatusPatch = Static<typeof fleetStatusPatchSchema>
export const fleetStatusPatchValidator = getValidator(fleetStatusPatchSchema, dataValidator)
export const fleetStatusPatchResolver = resolve<FleetStatus, HookContext<FleetStatusService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const fleetStatusQueryProperties = Type.Pick(fleetStatusSchema, [
  '_id',
  'deviceId',
  'deviceName',
  'isDriving',
  'driverId',
  'responseTimestamp',
  'recordedAt',
  'createdAt',
  'updatedAt'
])
export const fleetStatusQuerySchema = Type.Intersect(
  [
    querySyntax(fleetStatusQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type FleetStatusQuery = Static<typeof fleetStatusQuerySchema>
export const fleetStatusQueryValidator = getValidator(fleetStatusQuerySchema, queryValidator)
export const fleetStatusQueryResolver = resolve<FleetStatusQuery, HookContext<FleetStatusService>>({})