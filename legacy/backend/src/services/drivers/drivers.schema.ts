// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { DriverService } from './drivers.class'

// Main data model schema
export const driverSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    firstName: Type.String(), // from First Name
    lastName: Type.String(), // from Last Name
    dob: Type.Optional(Type.String()), // from DOB (Date of Birth)
    licenseNumber: Type.Optional(Type.String()), // from License Number
    licenseState: Type.Optional(Type.String()), // from License State
    driversLicenseType: Type.Optional(Type.String()), // from Drivers License Type
    licenseType: Type.Optional(Type.String()), // from License Type
    status: Type.Optional(Type.String()), // from Status
    worklist: Type.Optional(Type.String()), // from Worklist
    operatingAuthority: Type.Optional(Type.String()), // from Operating Authority
    driverStatus: Type.Optional(Type.String()), // from Driver Status
    hireDate: Type.Optional(Type.String()), // from Hire Date
    terminationDate: Type.Optional(Type.String()), // from Termination Date
    rehireDate: Type.Optional(Type.String()), // from Rehire Date
    workerClassification: Type.Optional(Type.String()), // from Worker Classification
    primaryPhone: Type.Optional(Type.String()), // from Primary Phone
    driverId: Type.Optional(Type.String()), // from Driver ID
    geotab: Type.Optional(Type.String()), // from GEOtab
    licenseExpDate: Type.Optional(Type.String()), // from License Exp Date
    drivingExperience: Type.Optional(Type.String()), // from Driving Experience
    cdlDrivingExperience: Type.Optional(Type.String()), // from CDL Driving Experience
    totalYearsExperience: Type.Optional(Type.Number()), // from Total number of years of driving experience
    groups: Type.Optional(Type.Array(Type.String())), // Array of GEOtab group IDs that this driver belongs to
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'Driver', additionalProperties: false }
)
export type Driver = Static<typeof driverSchema>
export const driverValidator = getValidator(driverSchema, dataValidator)
export const driverResolver = resolve<Driver, HookContext<DriverService>>({})

export const driverExternalResolver = resolve<Driver, HookContext<DriverService>>({})

// Schema for creating new entries
export const driverDataSchema = Type.Pick(
  driverSchema,
  [
    'firstName',
    'lastName',
    'dob',
    'licenseNumber',
    'licenseState',
    'driversLicenseType',
    'licenseType',
    'status',
    'worklist',
    'operatingAuthority',
    'driverStatus',
    'hireDate',
    'terminationDate',
    'rehireDate',
    'workerClassification',
    'primaryPhone',
    'driverId',
    'geotab',
    'licenseExpDate',
    'drivingExperience',
    'cdlDrivingExperience',
    'totalYearsExperience',
    'groups'
  ],
  {
    $id: 'DriverData'
  }
)
export type DriverData = Static<typeof driverDataSchema>
export const driverDataValidator = getValidator(driverDataSchema, dataValidator)
export const driverDataResolver = resolve<Driver, HookContext<DriverService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const driverPatchSchema = Type.Partial(driverSchema, {
  $id: 'DriverPatch'
})
export type DriverPatch = Static<typeof driverPatchSchema>
export const driverPatchValidator = getValidator(driverPatchSchema, dataValidator)
export const driverPatchResolver = resolve<Driver, HookContext<DriverService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const driverQueryProperties = Type.Pick(driverSchema, [
  '_id',
  'firstName',
  'lastName',
  'dob',
  'licenseNumber',
  'licenseState',
  'driversLicenseType',
  'licenseType',
  'status',
  'worklist',
  'operatingAuthority',
  'driverStatus',
  'hireDate',
  'terminationDate',
  'rehireDate',
  'workerClassification',
  'primaryPhone',
  'driverId',
  'geotab',
  'licenseExpDate',
  'drivingExperience',
  'cdlDrivingExperience',
  'totalYearsExperience',
  'groups',
  'createdAt',
  'updatedAt'
])
export const driverQuerySchema = Type.Intersect(
  [
    querySyntax(driverQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type DriverQuery = Static<typeof driverQuerySchema>
export const driverQueryValidator = getValidator(driverQuerySchema, queryValidator)
export const driverQueryResolver = resolve<DriverQuery, HookContext<DriverService>>({})