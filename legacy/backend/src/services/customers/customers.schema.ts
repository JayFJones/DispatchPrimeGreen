// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { CustomerService } from './customers.class'

// Main data model schema
export const customerSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    cid: Type.String(), // from CID
    name: Type.String(), // from CUSTNAME
    address: Type.Optional(Type.String()), // from Address
    city: Type.String(), // from CITY
    state: Type.String(), // from ST
    zipCode: Type.Optional(Type.String()), // from ZIP
    latitude: Type.Optional(Type.Number()), // from LATITUDE
    longitude: Type.Optional(Type.Number()), // from LONGITUDE
    timeZone: Type.Optional(Type.String()), // from Time Zone
    openTime: Type.Optional(Type.String()), // from OpenTime
    closeTime: Type.Optional(Type.String()), // from CloseTime
    lanterID: Type.Optional(Type.String()), // from Lanter_ID
    customerPDC: Type.Optional(Type.String()), // from Customer_PDC
    geoResult: Type.Optional(Type.String()), // from GEORESULT
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'Customer', additionalProperties: false }
)
export type Customer = Static<typeof customerSchema>
export const customerValidator = getValidator(customerSchema, dataValidator)
export const customerResolver = resolve<Customer, HookContext<CustomerService>>({})

export const customerExternalResolver = resolve<Customer, HookContext<CustomerService>>({})

// Schema for creating new entries
export const customerDataSchema = Type.Pick(
  customerSchema,
  [
    'cid',
    'name',
    'address',
    'city',
    'state',
    'zipCode',
    'latitude',
    'longitude',
    'timeZone',
    'openTime',
    'closeTime',
    'lanterID',
    'customerPDC',
    'geoResult'
  ],
  {
    $id: 'CustomerData'
  }
)
export type CustomerData = Static<typeof customerDataSchema>
export const customerDataValidator = getValidator(customerDataSchema, dataValidator)
export const customerDataResolver = resolve<Customer, HookContext<CustomerService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const customerPatchSchema = Type.Partial(customerSchema, {
  $id: 'CustomerPatch'
})
export type CustomerPatch = Static<typeof customerPatchSchema>
export const customerPatchValidator = getValidator(customerPatchSchema, dataValidator)
export const customerPatchResolver = resolve<Customer, HookContext<CustomerService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const customerQueryProperties = Type.Pick(customerSchema, [
  '_id',
  'cid',
  'name',
  'address',
  'city',
  'state',
  'zipCode',
  'latitude',
  'longitude',
  'timeZone',
  'openTime',
  'closeTime',
  'lanterID',
  'customerPDC',
  'geoResult',
  'createdAt',
  'updatedAt'
])
export const customerQuerySchema = Type.Intersect(
  [
    querySyntax(customerQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type CustomerQuery = Static<typeof customerQuerySchema>
export const customerQueryValidator = getValidator(customerQuerySchema, queryValidator)
export const customerQueryResolver = resolve<CustomerQuery, HookContext<CustomerService>>({})
