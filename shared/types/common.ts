import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const nullableUuid = z.string().uuid().nullable();

export const latitudeSchema = z.number().min(-90).max(90);

export const longitudeSchema = z.number().min(-180).max(180);

/** Standard created_at / updated_at fields for mutable entities */
export const timestampFields = {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
};

/** For append-only entities (audit_logs) that have no updated_at */
export const createdAtField = {
  createdAt: z.coerce.date(),
};
