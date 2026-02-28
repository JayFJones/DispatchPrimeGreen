import { z } from 'zod';
import { uuidSchema, timestampFields } from './common.js';
import {
  EquipmentTypeSchema,
  EquipmentStatusSchema,
  EquipmentOperationalStatusSchema,
} from '../constants/status.js';

/** Full equipment row as stored in PostgreSQL */
export const EquipmentSchema = z.object({
  id: uuidSchema,
  equipmentNumber: z.string().min(1),
  equipmentType: EquipmentTypeSchema,
  status: EquipmentStatusSchema,
  operationalStatus: EquipmentOperationalStatusSchema.nullable(),
  truckType: z.string().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: z.string().nullable(),
  vin: z.string().nullable(),
  licensePlate: z.string().nullable(),
  registrationState: z.string().nullable(),
  registrationExpiry: z.string().nullable(),
  insurancePolicy: z.string().nullable(),
  insuranceExpiry: z.string().nullable(),
  lastMaintenanceDate: z.string().nullable(),
  nextMaintenanceDate: z.string().nullable(),
  mileage: z.number().nullable(),
  fuelType: z.string().nullable(),
  capacity: z.string().nullable(),
  notes: z.string().nullable(),
  ...timestampFields,
});

/** Fields required when creating equipment */
export const EquipmentCreateSchema = EquipmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  operationalStatus: true,
  truckType: true,
  make: true,
  model: true,
  year: true,
  vin: true,
  licensePlate: true,
  registrationState: true,
  registrationExpiry: true,
  insurancePolicy: true,
  insuranceExpiry: true,
  lastMaintenanceDate: true,
  nextMaintenanceDate: true,
  mileage: true,
  fuelType: true,
  capacity: true,
  notes: true,
});

/** Fields that can be updated on equipment */
export const EquipmentUpdateSchema = EquipmentCreateSchema.partial();

export type Equipment = z.infer<typeof EquipmentSchema>;
export type EquipmentCreate = z.infer<typeof EquipmentCreateSchema>;
export type EquipmentUpdate = z.infer<typeof EquipmentUpdateSchema>;
