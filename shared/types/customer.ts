import { z } from 'zod';
import { uuidSchema, latitudeSchema, longitudeSchema, timestampFields } from './common.js';

/** Full customer row as stored in PostgreSQL */
export const CustomerSchema = z.object({
  id: uuidSchema,
  cid: z.string().min(1),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  timezone: z.string().nullable(),
  openTime: z.string().nullable(),
  closeTime: z.string().nullable(),
  lanterId: z.string().nullable(),
  customerPdc: z.string().nullable(),
  geoResult: z.string().nullable(),
  ...timestampFields,
});

/** Fields required when creating a customer */
export const CustomerCreateSchema = CustomerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  address: true,
  city: true,
  state: true,
  zipCode: true,
  latitude: true,
  longitude: true,
  timezone: true,
  openTime: true,
  closeTime: true,
  lanterId: true,
  customerPdc: true,
  geoResult: true,
});

/** Fields that can be updated on a customer */
export const CustomerUpdateSchema = CustomerCreateSchema.partial();

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;
