import { z } from 'zod';
import { uuidSchema, nullableUuid, latitudeSchema, longitudeSchema, timestampFields } from './common.js';
import { StopStatusSchema, OnTimeStatusSchema } from '../constants/status.js';

/** Full dispatch_event_stop row — stop-level execution tracking */
export const DispatchEventStopSchema = z.object({
  id: uuidSchema,
  dispatchEventId: uuidSchema,
  routeStopId: nullableUuid,
  sequence: z.number().int().nonnegative(),
  plannedEta: z.string().nullable(),
  plannedEtd: z.string().nullable(),
  actualArrivalTime: z.coerce.date().nullable(),
  actualDepartureTime: z.coerce.date().nullable(),
  serviceTime: z.number().nullable(),
  status: StopStatusSchema,
  onTimeStatus: OnTimeStatusSchema.nullable(),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  odometer: z.number().nullable(),
  fuelUsed: z.number().nullable(),
  notes: z.string().nullable(),
  exceptionReason: z.string().nullable(),
  skipReason: z.string().nullable(),
  requiresAttention: z.boolean(),
  ...timestampFields,
});

/** Fields required when creating a dispatch event stop */
export const DispatchEventStopCreateSchema = z.object({
  dispatchEventId: uuidSchema,
  routeStopId: nullableUuid.optional(),
  sequence: z.number().int().nonnegative(),
  plannedEta: z.string().nullable().optional(),
  plannedEtd: z.string().nullable().optional(),
  status: StopStatusSchema.optional(),
  requiresAttention: z.boolean().optional(),
});

/** Fields that can be updated on a dispatch event stop */
export const DispatchEventStopUpdateSchema = z.object({
  actualArrivalTime: z.coerce.date().nullable().optional(),
  actualDepartureTime: z.coerce.date().nullable().optional(),
  serviceTime: z.number().nullable().optional(),
  status: StopStatusSchema.optional(),
  onTimeStatus: OnTimeStatusSchema.nullable().optional(),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
  odometer: z.number().nullable().optional(),
  fuelUsed: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  exceptionReason: z.string().nullable().optional(),
  skipReason: z.string().nullable().optional(),
  requiresAttention: z.boolean().optional(),
});

export type DispatchEventStop = z.infer<typeof DispatchEventStopSchema>;
export type DispatchEventStopCreate = z.infer<typeof DispatchEventStopCreateSchema>;
export type DispatchEventStopUpdate = z.infer<typeof DispatchEventStopUpdateSchema>;
