import { z } from 'zod';
import { uuidSchema, nullableUuid, timestampFields } from './common.js';
import { AvailabilityTypeSchema } from '../constants/status.js';

/** Full availability row — driver availability/unavailability windows */
export const AvailabilitySchema = z.object({
  id: uuidSchema,
  driverId: uuidSchema,
  startDate: z.string(),
  endDate: z.string(),
  availabilityType: AvailabilityTypeSchema,
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  userId: nullableUuid,
  ...timestampFields,
});

/** Fields required when creating an availability record */
export const AvailabilityCreateSchema = AvailabilitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  reason: true,
  notes: true,
  userId: true,
});

/** Fields that can be updated on an availability record */
export const AvailabilityUpdateSchema = AvailabilityCreateSchema.omit({
  driverId: true,
}).partial();

export type Availability = z.infer<typeof AvailabilitySchema>;
export type AvailabilityCreate = z.infer<typeof AvailabilityCreateSchema>;
export type AvailabilityUpdate = z.infer<typeof AvailabilityUpdateSchema>;
