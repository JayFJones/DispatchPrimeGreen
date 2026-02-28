// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import { ObjectIdSchema } from '@feathersjs/typebox'

// Main data model schema
export const equipmentSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    equipmentNumber: Type.String(),
    equipmentType: Type.Union([
      Type.Literal('truck'),
      Type.Literal('trailer'),
      Type.Literal('sub-unit')
    ]),
    status: Type.Union([
      Type.Literal('active'),
      Type.Literal('inactive'),
      Type.Literal('maintenance'),
      Type.Literal('retired')
    ]),
    equipmentStatus: Type.Optional(Type.Union([
      Type.Literal('dedicated'),
      Type.Literal('substitute'),
      Type.Literal('spare'),
      Type.Literal('out-of-service')
    ])),
    truckType: Type.Optional(Type.String()),
    make: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    year: Type.Optional(Type.Number()),
    vin: Type.Optional(Type.String()),
    licensePlate: Type.Optional(Type.String()),
    registrationState: Type.Optional(Type.String()),
    registrationExpiry: Type.Optional(Type.String()),
    insurancePolicy: Type.Optional(Type.String()),
    insuranceExpiry: Type.Optional(Type.String()),
    lastMaintenanceDate: Type.Optional(Type.String()),
    nextMaintenanceDate: Type.Optional(Type.String()),
    mileage: Type.Optional(Type.Number()),
    fuelType: Type.Optional(Type.String()),
    capacity: Type.Optional(Type.String()),
    notes: Type.Optional(Type.String()),
    createdAt: Type.Number(),
    updatedAt: Type.Number()
  },
  { $id: 'Equipment', additionalProperties: false }
)
export type Equipment = Static<typeof equipmentSchema>
export const equipmentValidator = getValidator(equipmentSchema, dataValidator)
export const equipmentResolver = resolve<Equipment, HookContext>({})

export const equipmentExternalResolver = resolve<Equipment, HookContext>({})

// Schema for creating new entries
export const equipmentDataSchema = Type.Pick(equipmentSchema, [
  'equipmentNumber',
  'equipmentType',
  'status',
  'equipmentStatus',
  'truckType',
  'make',
  'model',
  'year',
  'vin',
  'licensePlate',
  'registrationState',
  'registrationExpiry',
  'insurancePolicy',
  'insuranceExpiry',
  'lastMaintenanceDate',
  'nextMaintenanceDate',
  'mileage',
  'fuelType',
  'capacity',
  'notes'
], {
  $id: 'EquipmentData'
})
export type EquipmentData = Static<typeof equipmentDataSchema>
export const equipmentDataValidator = getValidator(equipmentDataSchema, dataValidator)
export const equipmentDataResolver = resolve<Equipment, HookContext>({
  createdAt: async () => {
    return Date.now()
  },
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for updating entries
export const equipmentPatchSchema = Type.Partial(equipmentSchema, {
  $id: 'EquipmentPatch'
})
export type EquipmentPatch = Static<typeof equipmentPatchSchema>
export const equipmentPatchValidator = getValidator(equipmentPatchSchema, dataValidator)
export const equipmentPatchResolver = resolve<Equipment, HookContext>({
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for allowed query properties
export const equipmentQueryProperties = Type.Pick(equipmentSchema, [
  '_id',
  'equipmentNumber',
  'equipmentType',
  'status',
  'equipmentStatus',
  'truckType',
  'make',
  'model',
  'year',
  'vin',
  'licensePlate',
  'registrationState',
  'registrationExpiry',
  'insurancePolicy',
  'insuranceExpiry',
  'lastMaintenanceDate',
  'nextMaintenanceDate',
  'mileage',
  'fuelType',
  'capacity',
  'notes',
  'createdAt',
  'updatedAt'
])
export const equipmentQuerySchema = Type.Intersect(
  [
    querySyntax(equipmentQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type EquipmentQuery = Static<typeof equipmentQuerySchema>
export const equipmentQueryValidator = getValidator(equipmentQuerySchema, queryValidator)
export const equipmentQueryResolver = resolve<EquipmentQuery, HookContext>({})