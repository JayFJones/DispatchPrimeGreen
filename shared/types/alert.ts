import { z } from 'zod';
import { uuidSchema, nullableUuid, timestampFields } from './common.js';
import { AlertTypeSchema, AlertSeveritySchema } from '../constants/status.js';

/** Full alert row — HOS violations, appointment deviations, schedule issues */
export const AlertSchema = z.object({
  id: uuidSchema,
  terminalId: uuidSchema,
  alertType: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string(),
  message: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),

  // Reference to the entity that triggered the alert
  entityType: z.string().nullable(),
  entityId: uuidSchema.nullable(),

  // Acknowledgment workflow
  isAcknowledged: z.boolean(),
  acknowledgedBy: nullableUuid,
  acknowledgedAt: z.coerce.date().nullable(),

  // Resolution workflow
  isResolved: z.boolean(),
  resolvedBy: nullableUuid,
  resolvedAt: z.coerce.date().nullable(),
  resolutionNotes: z.string().nullable(),

  ...timestampFields,
});

/** Fields required when creating an alert */
export const AlertCreateSchema = z.object({
  terminalId: uuidSchema,
  alertType: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string().min(1),
  message: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  entityType: z.string().nullable().optional(),
  entityId: uuidSchema.nullable().optional(),
});

/** Acknowledge an alert */
export const AlertAcknowledgeSchema = z.object({
  acknowledgedBy: uuidSchema,
});

/** Resolve an alert */
export const AlertResolveSchema = z.object({
  resolvedBy: uuidSchema,
  resolutionNotes: z.string().nullable().optional(),
});

export type Alert = z.infer<typeof AlertSchema>;
export type AlertCreate = z.infer<typeof AlertCreateSchema>;
export type AlertAcknowledge = z.infer<typeof AlertAcknowledgeSchema>;
export type AlertResolve = z.infer<typeof AlertResolveSchema>;
