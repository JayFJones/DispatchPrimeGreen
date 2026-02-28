import { z } from 'zod';
import { uuidSchema, nullableUuid, createdAtField } from './common.js';
import { AuditEventTypeSchema, AuditEntityTypeSchema } from '../constants/status.js';

/** Full audit_log row — append-only, no updated_at (merged History + UserActivity from legacy) */
export const AuditLogSchema = z.object({
  id: uuidSchema,
  eventType: AuditEventTypeSchema,
  entityType: AuditEntityTypeSchema,
  entityId: uuidSchema.nullable(),
  userId: nullableUuid,
  userEmail: z.string().nullable(),
  summary: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  ...createdAtField,
});

/** Fields required when creating an audit log entry */
export const AuditLogCreateSchema = AuditLogSchema.omit({
  id: true,
  createdAt: true,
}).partial({
  entityId: true,
  userId: true,
  userEmail: true,
  metadata: true,
  ipAddress: true,
  userAgent: true,
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogCreate = z.infer<typeof AuditLogCreateSchema>;
