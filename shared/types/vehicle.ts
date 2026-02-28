import { z } from 'zod';
import { uuidSchema, latitudeSchema, longitudeSchema, timestampFields } from './common.js';
import { VehicleStatusSchema, VehicleTypeSchema } from '../constants/status.js';

/** Full vehicle row as stored in PostgreSQL */
export const VehicleSchema = z.object({
  id: uuidSchema,
  truckId: z.string().min(1),
  vin: z.string().nullable(),
  licensePlate: z.string().nullable(),
  licenseState: z.string().nullable(),
  odometer: z.number().nullable(),
  vehicleType: VehicleTypeSchema.nullable(),
  status: VehicleStatusSchema,
  geotabDeviceId: z.string().nullable(),
  lastLocationLatitude: latitudeSchema.nullable(),
  lastLocationLongitude: longitudeSchema.nullable(),
  lastLocationUpdated: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  ...timestampFields,
});

/** Fields required when creating a vehicle */
export const VehicleCreateSchema = VehicleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  vin: true,
  licensePlate: true,
  licenseState: true,
  odometer: true,
  vehicleType: true,
  status: true,
  geotabDeviceId: true,
  lastLocationLatitude: true,
  lastLocationLongitude: true,
  lastLocationUpdated: true,
  notes: true,
});

/** Fields that can be updated on a vehicle */
export const VehicleUpdateSchema = VehicleCreateSchema.partial();

export type Vehicle = z.infer<typeof VehicleSchema>;
export type VehicleCreate = z.infer<typeof VehicleCreateSchema>;
export type VehicleUpdate = z.infer<typeof VehicleUpdateSchema>;
