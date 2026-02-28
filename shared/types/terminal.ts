import { z } from 'zod';
import { uuidSchema, latitudeSchema, longitudeSchema, timestampFields } from './common.js';
import { TerminalTypeSchema } from '../constants/status.js';

const terminalLeaderSchema = z.object({
  name: z.string(),
  title: z.string(),
});

/** Full terminal row as stored in PostgreSQL */
export const TerminalSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  agent: z.string().nullable(),
  dcp: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  streetAddress: z.string().nullable(),
  streetAddress2: z.string().nullable(),
  zip: z.string().nullable(),
  country: z.string().nullable(),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  timezone: z.string(),
  geotabGroupId: z.string().nullable(),
  terminalType: TerminalTypeSchema,
  worklist: z.string().nullable(),
  leaders: z.array(terminalLeaderSchema),
  ...timestampFields,
});

/** Fields required when creating a terminal */
export const TerminalCreateSchema = TerminalSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  agent: true,
  dcp: true,
  city: true,
  state: true,
  streetAddress: true,
  streetAddress2: true,
  zip: true,
  country: true,
  latitude: true,
  longitude: true,
  geotabGroupId: true,
  worklist: true,
  leaders: true,
});

/** Fields that can be updated on a terminal */
export const TerminalUpdateSchema = TerminalCreateSchema.partial();

export type Terminal = z.infer<typeof TerminalSchema>;
export type TerminalCreate = z.infer<typeof TerminalCreateSchema>;
export type TerminalUpdate = z.infer<typeof TerminalUpdateSchema>;
