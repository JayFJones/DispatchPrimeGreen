import { z } from 'zod';
import { uuidSchema, timestampFields } from './common.js';

/** Full geotab_session row — encrypted credential storage for Geotab API access */
export const GeotabSessionSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  database: z.string(),
  username: z.string(),
  encryptedPassword: z.string(),
  sessionId: z.string().nullable(),
  server: z.string().nullable(),
  isAuthenticated: z.boolean(),
  lastAuthenticated: z.coerce.date().nullable(),
  authExpiry: z.coerce.date().nullable(),
  ...timestampFields,
});

/** Geotab session data safe for API responses (no encrypted password) */
export const GeotabSessionPublicSchema = GeotabSessionSchema.omit({
  encryptedPassword: true,
});

/** Request body for authenticating with Geotab */
export const GeotabAuthRequestSchema = z.object({
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

export type GeotabSession = z.infer<typeof GeotabSessionSchema>;
export type GeotabSessionPublic = z.infer<typeof GeotabSessionPublicSchema>;
export type GeotabAuthRequest = z.infer<typeof GeotabAuthRequestSchema>;
