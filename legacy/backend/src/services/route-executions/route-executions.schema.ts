// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { RouteExecutionService } from './route-executions.class'

// Stop execution detail schema
export const stopExecutionSchema = Type.Object({
  stopId: ObjectIdSchema(), // Reference to route-stops
  sequence: Type.Number(),
  
  // Planned times (copied from route-stops for historical record)
  plannedETA: Type.Optional(Type.String()),
  plannedETD: Type.Optional(Type.String()),
  
  // Actual execution times
  actualArrivalTime: Type.Optional(Type.String({ format: 'date-time' })), // ATA
  actualDepartureTime: Type.Optional(Type.String({ format: 'date-time' })), // ATD
  
  // Stop status
  status: Type.Union([
    Type.Literal('pending'),     // Not yet visited
    Type.Literal('arrived'),     // Vehicle arrived, servicing
    Type.Literal('completed'),   // Stop completed successfully
    Type.Literal('skipped'),     // Stop was skipped
    Type.Literal('exception')    // Stop had issues
  ]),
  
  // Performance metrics
  serviceTime: Type.Optional(Type.Number()), // Minutes spent at stop
  onTimeStatus: Type.Optional(Type.Union([
    Type.Literal('early'),
    Type.Literal('on-time'), 
    Type.Literal('late')
  ])),
  
  // Geotab integration data
  geotabData: Type.Optional(Type.Object({
    latitude: Type.Optional(Type.Number()),
    longitude: Type.Optional(Type.Number()),
    odometer: Type.Optional(Type.Number()),
    fuelUsed: Type.Optional(Type.Number())
  })),
  
  // Notes and exceptions
  notes: Type.Optional(Type.String()),
  exceptionReason: Type.Optional(Type.String()),
  
  // Skip/attention fields
  skipReason: Type.Optional(Type.String()), // Reason for skipping this stop
  showInAttention: Type.Optional(Type.Boolean()) // Whether to show in attention panel
})

// Main data model schema
export const routeExecutionSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    
    // Core identification - compound key for uniqueness
    routeId: ObjectIdSchema(), // Reference to routes collection
    executionDate: Type.String({ format: 'date' }), // YYYY-MM-DD format
    
    // Execution context
    terminalId: ObjectIdSchema(), // For data scoping
    assignedDriverId: Type.Optional(Type.Union([ObjectIdSchema(), Type.Null()])), // Actual driver (may differ from route default)
    assignedTruckNumber: Type.Optional(Type.String()), // Actual truck
    
    // Execution status
    status: Type.Union([
      Type.Literal('scheduled'),    // Route is scheduled but not started
      Type.Literal('in-progress'),  // Route execution underway
      Type.Literal('completed'),    // All stops completed
      Type.Literal('cancelled'),    // Route was cancelled
      Type.Literal('exception')     // Route had issues requiring attention
    ]),
    
    // Cancellation details (only relevant when status is 'cancelled')
    cancellationReason: Type.Optional(Type.String()),
    cancellationNotes: Type.Optional(Type.String()),
    
    // Execution timing
    plannedDepartureTime: Type.Optional(Type.String()), // From route template
    actualDepartureTime: Type.Optional(Type.String({ format: 'date-time' })),
    estimatedCompletionTime: Type.Optional(Type.String({ format: 'date-time' })),
    actualCompletionTime: Type.Optional(Type.String({ format: 'date-time' })),
    
    // Stop execution details - this is the core value
    stops: Type.Array(stopExecutionSchema),
    
    // Overall route metrics
    totalMiles: Type.Optional(Type.Number()),
    totalServiceTime: Type.Optional(Type.Number()),
    fuelUsed: Type.Optional(Type.Number()),
    onTimePerformance: Type.Optional(Type.Number()), // Percentage
    
    // Metadata
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' })),
    lastGeotabSync: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'RouteExecution', additionalProperties: false }
)

export type RouteExecution = Static<typeof routeExecutionSchema>
export type StopExecution = Static<typeof stopExecutionSchema>
export const routeExecutionValidator = getValidator(routeExecutionSchema, dataValidator)
export const routeExecutionResolver = resolve<RouteExecution, HookContext<RouteExecutionService>>({})

export const routeExecutionExternalResolver = resolve<RouteExecution, HookContext<RouteExecutionService>>({})

// Schema for creating new entries
export const routeExecutionDataSchema = Type.Pick(
  routeExecutionSchema,
  [
    'routeId',
    'executionDate',
    'terminalId',
    'assignedDriverId',
    'assignedTruckNumber',
    'status',
    'cancellationReason',
    'cancellationNotes',
    'plannedDepartureTime',
    'actualDepartureTime',
    'estimatedCompletionTime',
    'actualCompletionTime',
    'stops',
    'totalMiles',
    'totalServiceTime',
    'fuelUsed',
    'onTimePerformance',
    'lastGeotabSync'
  ],
  {
    $id: 'RouteExecutionData'
  }
)
export type RouteExecutionData = Static<typeof routeExecutionDataSchema>
export const routeExecutionDataValidator = getValidator(routeExecutionDataSchema, dataValidator)
export const routeExecutionDataResolver = resolve<RouteExecution, HookContext<RouteExecutionService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const routeExecutionPatchSchema = Type.Partial(routeExecutionSchema, {
  $id: 'RouteExecutionPatch'
})
export type RouteExecutionPatch = Static<typeof routeExecutionPatchSchema>
export const routeExecutionPatchValidator = getValidator(routeExecutionPatchSchema, dataValidator)
export const routeExecutionPatchResolver = resolve<RouteExecution, HookContext<RouteExecutionService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const routeExecutionQueryProperties = Type.Pick(routeExecutionSchema, [
  '_id',
  'routeId',
  'executionDate',
  'terminalId',
  'assignedDriverId',
  'assignedTruckNumber',
  'status',
  'plannedDepartureTime',
  'actualDepartureTime',
  'estimatedCompletionTime',
  'actualCompletionTime',
  'totalMiles',
  'totalServiceTime',
  'fuelUsed',
  'onTimePerformance',
  'createdAt',
  'updatedAt',
  'lastGeotabSync'
])
export const routeExecutionQuerySchema = Type.Intersect(
  [
    querySyntax(routeExecutionQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type RouteExecutionQuery = Static<typeof routeExecutionQuerySchema>
export const routeExecutionQueryValidator = getValidator(routeExecutionQuerySchema, queryValidator)
export const routeExecutionQueryResolver = resolve<RouteExecutionQuery, HookContext<RouteExecutionService>>({})