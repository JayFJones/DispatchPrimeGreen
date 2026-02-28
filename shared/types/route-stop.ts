import { z } from 'zod';
import { uuidSchema, nullableUuid, latitudeSchema, longitudeSchema, timestampFields } from './common.js';

/** Full route_stop row as stored in PostgreSQL. Customer data is denormalized — stop-level values are the source of truth. */
export const RouteStopSchema = z.object({
  id: uuidSchema,
  routeId: uuidSchema,
  customerId: nullableUuid,
  sequence: z.number().int().nonnegative(),
  cid: z.string().nullable(),
  custName: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  eta: z.string().nullable(),
  etd: z.string().nullable(),
  commitTime: z.string().nullable(),
  fixedTime: z.string().nullable(),
  cube: z.string().nullable(),
  timezone: z.string().nullable(),
  openTime: z.string().nullable(),
  closeTime: z.string().nullable(),
  lanterId: z.string().nullable(),
  customerPdc: z.string().nullable(),
  geoResult: z.string().nullable(),
  ...timestampFields,
});

/** Fields required when creating a route stop */
export const RouteStopCreateSchema = RouteStopSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  customerId: true,
  cid: true,
  custName: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  eta: true,
  etd: true,
  commitTime: true,
  fixedTime: true,
  cube: true,
  timezone: true,
  openTime: true,
  closeTime: true,
  lanterId: true,
  customerPdc: true,
  geoResult: true,
});

/** Fields that can be updated on a route stop */
export const RouteStopUpdateSchema = RouteStopCreateSchema.omit({
  routeId: true,
}).partial();

export type RouteStop = z.infer<typeof RouteStopSchema>;
export type RouteStopCreate = z.infer<typeof RouteStopCreateSchema>;
export type RouteStopUpdate = z.infer<typeof RouteStopUpdateSchema>;
