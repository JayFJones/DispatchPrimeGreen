// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { RouteService } from './routes.class'

// Main data model schema
export const routeSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    trkid: Type.String(), // from TRKID (e.g., "ALBE.BES.1")
    terminalId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // reference to terminals collection
    legNumber: Type.Optional(Type.Number()), // from LegNumber
    totalStops: Type.Optional(Type.Number()), // calculated dynamically, not persisted
    estimatedDuration: Type.Optional(Type.Number()), // calculated from stops in minutes
    estimatedDistance: Type.Optional(Type.Number()), // total distance in miles
    stops: Type.Optional(Type.Array(Type.Any())), // populated route stops array
    // Driver Board fields
    truckNumber: Type.Optional(Type.String()), // from Truck # column
    subUnitNumber: Type.Optional(Type.String()), // from Sub Unit column
    defaultDriverId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // reference to drivers collection
    fuelCard: Type.Optional(Type.String()), // from Fuel Card column
    scanner: Type.Optional(Type.String()), // from Scanner column
    departureTime: Type.Optional(Type.String()), // from Departure Time column
    // Weekly schedule - defines which days of the week this route runs
    sun: Type.Optional(Type.Boolean()), // Sunday
    mon: Type.Optional(Type.Boolean()), // Monday
    tue: Type.Optional(Type.Boolean()), // Tuesday
    wed: Type.Optional(Type.Boolean()), // Wednesday
    thu: Type.Optional(Type.Boolean()), // Thursday
    fri: Type.Optional(Type.Boolean()), // Friday
    sat: Type.Optional(Type.Boolean()), // Saturday
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'Route', additionalProperties: false }
)
export type Route = Static<typeof routeSchema>
export const routeValidator = getValidator(routeSchema, dataValidator)
export const routeResolver = resolve<Route, HookContext<RouteService>>({})

export const routeExternalResolver = resolve<Route, HookContext<RouteService>>({})

// Schema for creating new entries
export const routeDataSchema = Type.Pick(
  routeSchema,
  ['trkid', 'terminalId', 'legNumber', 'truckNumber', 'subUnitNumber', 'defaultDriverId', 'fuelCard', 'scanner', 'departureTime', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  {
    $id: 'RouteData'
  }
)
export type RouteData = Static<typeof routeDataSchema>
export const routeDataValidator = getValidator(routeDataSchema, dataValidator)
export const routeDataResolver = resolve<Route, HookContext<RouteService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const routePatchSchema = Type.Partial(routeSchema, {
  $id: 'RoutePatch'
})
export type RoutePatch = Static<typeof routePatchSchema>
export const routePatchValidator = getValidator(routePatchSchema, dataValidator)
export const routePatchResolver = resolve<Route, HookContext<RouteService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const routeQueryProperties = Type.Pick(routeSchema, [
  '_id',
  'trkid',
  'terminalId',
  'legNumber',
  'estimatedDuration',
  'truckNumber',
  'subUnitNumber',
  'defaultDriverId',
  'fuelCard',
  'scanner',
  'departureTime',
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'createdAt',
  'updatedAt'
])
export const routeQuerySchema = Type.Intersect(
  [
    querySyntax(routeQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type RouteQuery = Static<typeof routeQuerySchema>
export const routeQueryValidator = getValidator(routeQuerySchema, queryValidator)
export const routeQueryResolver = resolve<RouteQuery, HookContext<RouteService>>({})
