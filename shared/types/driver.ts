import { z } from 'zod';
import { uuidSchema, timestampFields } from './common.js';
import { WorkerClassificationSchema } from '../constants/status.js';

/** Full driver row as stored in PostgreSQL */
export const DriverSchema = z.object({
  id: uuidSchema,
  firstName: z.string(),
  lastName: z.string(),
  dob: z.string().nullable(),
  employeeNumber: z.string().nullable(),
  geotabUsername: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  licenseState: z.string().nullable(),
  licenseType: z.string().nullable(),
  licenseExpDate: z.string().nullable(),
  status: z.string().nullable(),
  workerClassification: WorkerClassificationSchema.nullable(),
  operatingAuthority: z.string().nullable(),
  hireDate: z.string().nullable(),
  terminationDate: z.string().nullable(),
  rehireDate: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  drivingExperience: z.string().nullable(),
  cdlDrivingExperience: z.string().nullable(),
  totalYearsExperience: z.string().nullable(),
  worklist: z.string().nullable(),
  ...timestampFields,
});

/** Fields required when creating a driver */
export const DriverCreateSchema = DriverSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  dob: true,
  employeeNumber: true,
  geotabUsername: true,
  licenseNumber: true,
  licenseState: true,
  licenseType: true,
  licenseExpDate: true,
  status: true,
  workerClassification: true,
  operatingAuthority: true,
  hireDate: true,
  terminationDate: true,
  rehireDate: true,
  primaryPhone: true,
  drivingExperience: true,
  cdlDrivingExperience: true,
  totalYearsExperience: true,
  worklist: true,
});

/** Fields that can be updated on a driver */
export const DriverUpdateSchema = DriverCreateSchema.partial();

export type Driver = z.infer<typeof DriverSchema>;
export type DriverCreate = z.infer<typeof DriverCreateSchema>;
export type DriverUpdate = z.infer<typeof DriverUpdateSchema>;
