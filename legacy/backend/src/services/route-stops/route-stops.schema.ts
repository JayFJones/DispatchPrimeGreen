// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { RouteStopService } from './route-stops.class'

// Main data model schema
export const routeStopSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    routeId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // reference to routes collection
    customerId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // reference to customers collection
    sequence: Type.Number(), // from Seq
    eta: Type.Optional(Type.String()), // from ETA
    etd: Type.Optional(Type.String()), // from ETD
    commitTime: Type.Optional(Type.String()), // from CommitTime
    fixedTime: Type.Optional(Type.Number()), // from FTime
    cube: Type.Optional(Type.Number()), // from Cube
    timeZone: Type.Optional(Type.String()), // from Time Zone
    lanterID: Type.Optional(Type.String()), // from Lanter_ID
    customerPDC: Type.Optional(Type.String()), // from Customer_PDC
    // Row-specific customer data (source of truth)
    cid: Type.Optional(Type.String()), // from CID
    custName: Type.Optional(Type.String()), // from CUSTNAME
    address: Type.Optional(Type.String()), // from Address
    city: Type.Optional(Type.String()), // from CITY
    state: Type.Optional(Type.String()), // from ST
    zipCode: Type.Optional(Type.String()), // from ZIP
    openTime: Type.Optional(Type.String()), // from OpenTime
    closeTime: Type.Optional(Type.String()), // from CloseTime
    latitude: Type.Optional(Type.Number()), // from LATITUDE
    longitude: Type.Optional(Type.Number()), // from LONGITUDE
    geoResult: Type.Optional(Type.String()), // from GEORESULT
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'RouteStop', additionalProperties: false }
)
export type RouteStop = Static<typeof routeStopSchema>
export const routeStopValidator = getValidator(routeStopSchema, dataValidator)
export const routeStopResolver = resolve<RouteStop, HookContext<RouteStopService>>({})

export const routeStopExternalResolver = resolve<RouteStop, HookContext<RouteStopService>>({})

// Schema for creating new entries
export const routeStopDataSchema = Type.Pick(
  routeStopSchema,
  [
    'routeId',
    'customerId',
    'sequence',
    'eta',
    'etd',
    'commitTime',
    'fixedTime',
    'cube',
    'timeZone',
    'lanterID',
    'customerPDC',
    'cid',
    'custName',
    'address',
    'city',
    'state',
    'zipCode',
    'openTime',
    'closeTime',
    'latitude',
    'longitude',
    'geoResult'
  ],
  {
    $id: 'RouteStopData'
  }
)
export type RouteStopData = Static<typeof routeStopDataSchema>
export const routeStopDataValidator = getValidator(routeStopDataSchema, dataValidator)
export const routeStopDataResolver = resolve<RouteStop, HookContext<RouteStopService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const routeStopPatchSchema = Type.Partial(routeStopSchema, {
  $id: 'RouteStopPatch'
})
export type RouteStopPatch = Static<typeof routeStopPatchSchema>
export const routeStopPatchValidator = getValidator(routeStopPatchSchema, dataValidator)
export const routeStopPatchResolver = resolve<RouteStop, HookContext<RouteStopService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const routeStopQueryProperties = Type.Pick(routeStopSchema, [
  '_id',
  'routeId',
  'customerId',
  'sequence',
  'eta',
  'etd',
  'commitTime',
  'fixedTime',
  'cube',
  'timeZone',
  'lanterID',
  'customerPDC',
  'cid',
  'custName',
  'address',
  'city',
  'state',
  'zipCode',
  'openTime',
  'closeTime',
  'latitude',
  'longitude',
  'geoResult',
  'createdAt',
  'updatedAt'
])
export const routeStopQuerySchema = Type.Intersect(
  [
    querySyntax(routeStopQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type RouteStopQuery = Static<typeof routeStopQuerySchema>
export const routeStopQueryValidator = getValidator(routeStopQuerySchema, queryValidator)
export const routeStopQueryResolver = resolve<RouteStopQuery, HookContext<RouteStopService>>({})
