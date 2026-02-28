// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { DispatchedRouteService } from './dispatched-routes.class'

// Main data model schema
export const dispatchedRouteSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    routeId: ObjectIdSchema(), // Reference to base route
    executionDate: Type.String({ format: 'date' }), // When route runs (YYYY-MM-DD)
    terminalId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // Terminal managing this execution
    assignedDriverId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // Driver assigned
    assignedTruckId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // Truck assigned
    assignedSubUnitId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // Sub-unit assigned
    status: Type.Union([
      Type.Literal('planned'),
      Type.Literal('assigned'), 
      Type.Literal('dispatched'),
      Type.Literal('in-transit'),
      Type.Literal('completed'),
      Type.Literal('cancelled'),
      Type.Literal('delayed')
    ]),
    plannedDepartureTime: Type.Optional(Type.String()), // Planned departure time (HH:MM)
    actualDepartureTime: Type.Optional(Type.String()), // Actual departure time (HH:MM)
    estimatedReturnTime: Type.Optional(Type.String()), // Expected return time (HH:MM)
    actualReturnTime: Type.Optional(Type.String()), // Actual return time (HH:MM)
    dispatchNotes: Type.Optional(Type.String()), // Dispatch planning notes
    operationalNotes: Type.Optional(Type.String()), // Day-of execution notes
    priority: Type.Optional(Type.Union([
      Type.Literal('normal'),
      Type.Literal('high'),
      Type.Literal('urgent')
    ])),
    estimatedDelayMinutes: Type.Optional(Type.Number()), // Current delay estimate
    lastLocationUpdate: Type.Optional(Type.String({ format: 'date-time' })), // Last GPS update
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'DispatchedRoute', additionalProperties: false }
)
export type DispatchedRoute = Static<typeof dispatchedRouteSchema>
export const dispatchedRouteValidator = getValidator(dispatchedRouteSchema, dataValidator)
export const dispatchedRouteResolver = resolve<DispatchedRoute, HookContext<DispatchedRouteService>>({})

export const dispatchedRouteExternalResolver = resolve<DispatchedRoute, HookContext<DispatchedRouteService>>({})

// Schema for creating new entries
export const dispatchedRouteDataSchema = Type.Pick(
  dispatchedRouteSchema,
  [
    'routeId', 
    'executionDate', 
    'terminalId', 
    'assignedDriverId', 
    'assignedTruckId', 
    'assignedSubUnitId',
    'status', 
    'plannedDepartureTime', 
    'dispatchNotes', 
    'priority'
  ],
  {
    $id: 'DispatchedRouteData'
  }
)
export type DispatchedRouteData = Static<typeof dispatchedRouteDataSchema>
export const dispatchedRouteDataValidator = getValidator(dispatchedRouteDataSchema, dataValidator)
export const dispatchedRouteDataResolver = resolve<DispatchedRoute, HookContext<DispatchedRouteService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const dispatchedRoutePatchSchema = Type.Partial(dispatchedRouteSchema, {
  $id: 'DispatchedRoutePatch'
})
export type DispatchedRoutePatch = Static<typeof dispatchedRoutePatchSchema>
export const dispatchedRoutePatchValidator = getValidator(dispatchedRoutePatchSchema, dataValidator)
export const dispatchedRoutePatchResolver = resolve<DispatchedRoute, HookContext<DispatchedRouteService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const dispatchedRouteQueryProperties = Type.Pick(dispatchedRouteSchema, [
  '_id',
  'routeId',
  'executionDate',
  'terminalId',
  'assignedDriverId',
  'assignedTruckId',
  'assignedSubUnitId',
  'status',
  'plannedDepartureTime',
  'actualDepartureTime',
  'priority',
  'createdAt',
  'updatedAt'
])
export const dispatchedRouteQuerySchema = Type.Intersect(
  [
    querySyntax(dispatchedRouteQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type DispatchedRouteQuery = Static<typeof dispatchedRouteQuerySchema>
export const dispatchedRouteQueryValidator = getValidator(dispatchedRouteQuerySchema, queryValidator)
export const dispatchedRouteQueryResolver = resolve<DispatchedRouteQuery, HookContext<DispatchedRouteService>>({})