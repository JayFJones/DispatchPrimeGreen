import { z } from 'zod';
import { uuidSchema, nullableUuid, timestampFields } from './common.js';
import { DispatchStatusSchema, DispatchPrioritySchema } from '../constants/status.js';

/** Full dispatch_event row — merged DispatchedRoute + RouteExecution from legacy */
export const DispatchEventSchema = z.object({
  id: uuidSchema,
  routeId: uuidSchema,
  terminalId: uuidSchema,
  executionDate: z.string(),
  assignedDriverId: nullableUuid,
  assignedTruckId: z.string().nullable(),
  assignedSubUnitId: z.string().nullable(),
  status: DispatchStatusSchema,
  priority: DispatchPrioritySchema,

  // Timing
  plannedDepartureTime: z.string().nullable(),
  actualDepartureTime: z.coerce.date().nullable(),
  estimatedReturnTime: z.string().nullable(),
  actualReturnTime: z.coerce.date().nullable(),
  estimatedCompletionTime: z.coerce.date().nullable(),
  actualCompletionTime: z.coerce.date().nullable(),

  // Delays and cancellation
  estimatedDelayMinutes: z.number().int().nullable(),
  cancellationReason: z.string().nullable(),
  cancellationNotes: z.string().nullable(),

  // Notes
  dispatchNotes: z.string().nullable(),
  operationalNotes: z.string().nullable(),

  // Performance metrics (updated during execution)
  totalMiles: z.number().nullable(),
  totalServiceTime: z.number().nullable(),
  fuelUsed: z.number().nullable(),
  onTimePerformance: z.number().nullable(),

  // Geotab tracking
  lastLocationUpdate: z.coerce.date().nullable(),
  lastGeotabSync: z.coerce.date().nullable(),

  ...timestampFields,
});

/** Fields required when creating a dispatch event */
export const DispatchEventCreateSchema = z.object({
  routeId: uuidSchema,
  terminalId: uuidSchema,
  executionDate: z.string(),
  assignedDriverId: nullableUuid.optional(),
  assignedTruckId: z.string().nullable().optional(),
  assignedSubUnitId: z.string().nullable().optional(),
  status: DispatchStatusSchema.optional(),
  priority: DispatchPrioritySchema.optional(),
  plannedDepartureTime: z.string().nullable().optional(),
  dispatchNotes: z.string().nullable().optional(),
  operationalNotes: z.string().nullable().optional(),
});

/** Fields that can be updated on a dispatch event */
export const DispatchEventUpdateSchema = z.object({
  assignedDriverId: nullableUuid.optional(),
  assignedTruckId: z.string().nullable().optional(),
  assignedSubUnitId: z.string().nullable().optional(),
  status: DispatchStatusSchema.optional(),
  priority: DispatchPrioritySchema.optional(),
  plannedDepartureTime: z.string().nullable().optional(),
  actualDepartureTime: z.coerce.date().nullable().optional(),
  estimatedReturnTime: z.string().nullable().optional(),
  actualReturnTime: z.coerce.date().nullable().optional(),
  estimatedCompletionTime: z.coerce.date().nullable().optional(),
  actualCompletionTime: z.coerce.date().nullable().optional(),
  estimatedDelayMinutes: z.number().int().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  cancellationNotes: z.string().nullable().optional(),
  dispatchNotes: z.string().nullable().optional(),
  operationalNotes: z.string().nullable().optional(),
  totalMiles: z.number().nullable().optional(),
  totalServiceTime: z.number().nullable().optional(),
  fuelUsed: z.number().nullable().optional(),
  onTimePerformance: z.number().nullable().optional(),
  lastLocationUpdate: z.coerce.date().nullable().optional(),
  lastGeotabSync: z.coerce.date().nullable().optional(),
});

export type DispatchEvent = z.infer<typeof DispatchEventSchema>;
export type DispatchEventCreate = z.infer<typeof DispatchEventCreateSchema>;
export type DispatchEventUpdate = z.infer<typeof DispatchEventUpdateSchema>;
