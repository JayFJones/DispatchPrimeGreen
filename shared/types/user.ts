import { z } from 'zod';
import { uuidSchema, nullableUuid, timestampFields } from './common.js';
import { RoleSchema } from '../constants/roles.js';

/** Full user row as stored in PostgreSQL */
export const UserSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  passwordHash: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  roles: z.array(RoleSchema),
  homeTerminalId: nullableUuid,
  favoriteTerminalIds: z.array(uuidSchema),
  isActive: z.boolean(),
  lastLoggedIn: z.coerce.date().nullable(),
  ...timestampFields,
});

/** User data safe to return in API responses (no password hash) */
export const UserPublicSchema = UserSchema.omit({
  passwordHash: true,
});

/** Fields required when creating a user */
export const UserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  roles: z.array(RoleSchema).optional(),
  homeTerminalId: nullableUuid.optional(),
  isActive: z.boolean().optional(),
});

/** Fields that can be updated on a user */
export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  roles: z.array(RoleSchema).optional(),
  homeTerminalId: nullableUuid.optional(),
  favoriteTerminalIds: z.array(uuidSchema).optional(),
  isActive: z.boolean().optional(),
});

/** Password change request */
export const PasswordChangeSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

export type User = z.infer<typeof UserSchema>;
export type UserPublic = z.infer<typeof UserPublicSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type PasswordChange = z.infer<typeof PasswordChangeSchema>;
