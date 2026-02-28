// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { RouteSubstitutionService } from './route-substitution.class'

// Main data model schema
export const routeSubstitutionSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    routeId: Type.String(), // Reference to the route being substituted
    startDate: Type.Optional(Type.String({ format: 'date' })), // When substitution starts (optional, immediate if not provided)
    endDate: Type.Optional(Type.String({ format: 'date' })), // When substitution ends (optional, ongoing if not provided)
    
    // Substitution fields - any combination can be provided
    driverId: Type.Optional(Type.String()), // Substitute driver
    truckNumber: Type.Optional(Type.String()), // Substitute truck
    subUnitNumber: Type.Optional(Type.String()), // Substitute sub-unit
    scanner: Type.Optional(Type.String()), // Substitute scanner
    fuelCard: Type.Optional(Type.String()), // Substitute fuel card
    
    // Route stops substitution - could be a JSON array of stop modifications
    routeStopsModifications: Type.Optional(Type.String()), // JSON string of route stop changes
    
    // Metadata
    reason: Type.Optional(Type.String()), // Reason for substitution
    createdBy: Type.Optional(Type.String()), // User who created the substitution
    notes: Type.Optional(Type.String()), // Additional notes
    
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'RouteSubstitution', additionalProperties: false }
)
export type RouteSubstitution = Static<typeof routeSubstitutionSchema>
export const routeSubstitutionValidator = getValidator(routeSubstitutionSchema, dataValidator)
export const routeSubstitutionResolver = resolve<RouteSubstitution, HookContext<RouteSubstitutionService>>({})

export const routeSubstitutionExternalResolver = resolve<RouteSubstitution, HookContext<RouteSubstitutionService>>({})

// Schema for creating new entries
export const routeSubstitutionDataSchema = Type.Pick(
  routeSubstitutionSchema,
  [
    'routeId',
    'startDate',
    'endDate',
    'driverId',
    'truckNumber',
    'subUnitNumber',
    'scanner',
    'fuelCard',
    'routeStopsModifications',
    'reason',
    'createdBy',
    'notes'
  ],
  {
    $id: 'RouteSubstitutionData'
  }
)
export type RouteSubstitutionData = Static<typeof routeSubstitutionDataSchema>
export const routeSubstitutionDataValidator = getValidator(routeSubstitutionDataSchema, dataValidator)
export const routeSubstitutionDataResolver = resolve<RouteSubstitution, HookContext<RouteSubstitutionService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const routeSubstitutionPatchSchema = Type.Partial(routeSubstitutionSchema, {
  $id: 'RouteSubstitutionPatch'
})
export type RouteSubstitutionPatch = Static<typeof routeSubstitutionPatchSchema>
export const routeSubstitutionPatchValidator = getValidator(routeSubstitutionPatchSchema, dataValidator)
export const routeSubstitutionPatchResolver = resolve<RouteSubstitution, HookContext<RouteSubstitutionService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const routeSubstitutionQueryProperties = Type.Pick(routeSubstitutionSchema, [
  '_id',
  'routeId',
  'startDate',
  'endDate',
  'driverId',
  'truckNumber',
  'subUnitNumber',
  'scanner',
  'fuelCard',
  'routeStopsModifications',
  'reason',
  'createdBy',
  'notes',
  'createdAt',
  'updatedAt'
])
export const routeSubstitutionQuerySchema = Type.Object({}, { additionalProperties: true })
export type RouteSubstitutionQuery = Static<typeof routeSubstitutionQuerySchema>
export const routeSubstitutionQueryValidator = getValidator(routeSubstitutionQuerySchema, queryValidator)
export const routeSubstitutionQueryResolver = resolve<RouteSubstitutionQuery, HookContext<RouteSubstitutionService>>({})