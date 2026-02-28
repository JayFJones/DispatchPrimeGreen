import { z } from 'zod';
import { uuidSchema, nullableUuid, timestampFields } from './common.js';

/** Full route_substitution row — temporary overrides to route defaults */
export const RouteSubstitutionSchema = z.object({
  id: uuidSchema,
  routeId: uuidSchema,
  startDate: z.string(),
  endDate: z.string(),
  driverId: nullableUuid,
  truckNumber: z.string().nullable(),
  subUnitNumber: z.string().nullable(),
  scanner: z.string().nullable(),
  fuelCard: z.string().nullable(),
  routeStopsModifications: z.unknown().nullable(),
  reason: z.string().nullable(),
  createdBy: nullableUuid,
  notes: z.string().nullable(),
  ...timestampFields,
});

/** Fields required when creating a route substitution */
export const RouteSubstitutionCreateSchema = RouteSubstitutionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  driverId: true,
  truckNumber: true,
  subUnitNumber: true,
  scanner: true,
  fuelCard: true,
  routeStopsModifications: true,
  reason: true,
  createdBy: true,
  notes: true,
});

/** Fields that can be updated on a route substitution */
export const RouteSubstitutionUpdateSchema = RouteSubstitutionCreateSchema.omit({
  routeId: true,
}).partial();

export type RouteSubstitution = z.infer<typeof RouteSubstitutionSchema>;
export type RouteSubstitutionCreate = z.infer<typeof RouteSubstitutionCreateSchema>;
export type RouteSubstitutionUpdate = z.infer<typeof RouteSubstitutionUpdateSchema>;
