import { z } from 'zod';
import { uuidSchema, nullableUuid, timestampFields } from './common.js';

/** Full route row as stored in PostgreSQL */
export const RouteSchema = z.object({
  id: uuidSchema,
  trkid: z.string().min(1),
  terminalId: uuidSchema,
  legNumber: z.string().nullable(),
  truckNumber: z.string().nullable(),
  subUnitNumber: z.string().nullable(),
  defaultDriverId: nullableUuid,
  fuelCard: z.string().nullable(),
  scanner: z.string().nullable(),
  departureTime: z.string().nullable(),
  sun: z.boolean(),
  mon: z.boolean(),
  tue: z.boolean(),
  wed: z.boolean(),
  thu: z.boolean(),
  fri: z.boolean(),
  sat: z.boolean(),
  totalStops: z.number().int().nonnegative(),
  estimatedDuration: z.number().nullable(),
  estimatedDistance: z.number().nullable(),
  ...timestampFields,
});

/** Fields required when creating a route */
export const RouteCreateSchema = RouteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  legNumber: true,
  truckNumber: true,
  subUnitNumber: true,
  defaultDriverId: true,
  fuelCard: true,
  scanner: true,
  departureTime: true,
  sun: true,
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: true,
  totalStops: true,
  estimatedDuration: true,
  estimatedDistance: true,
});

/** Fields that can be updated on a route */
export const RouteUpdateSchema = RouteCreateSchema.omit({
  terminalId: true,
}).partial();

export type Route = z.infer<typeof RouteSchema>;
export type RouteCreate = z.infer<typeof RouteCreateSchema>;
export type RouteUpdate = z.infer<typeof RouteUpdateSchema>;
