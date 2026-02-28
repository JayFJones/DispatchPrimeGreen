import type { UserPublic, UserUpdate, PasswordChange } from '@dispatch/shared/types/user';
import {
  findUserPublicById,
  findUserById,
  updateUser as updateUserDb,
  updatePassword as updatePasswordDb,
  listUsers as listUsersDb,
} from '../db/queries/users.js';
import { createAuditLog } from '../db/queries/audit-logs.js';
import { hashPassword, verifyPassword } from '../auth/password.js';

export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

export async function getProfile(userId: string): Promise<UserPublic> {
  const user = await findUserPublicById(userId);
  if (!user) {
    throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
  }
  return user;
}

/**
 * Self-service profile update — cannot change roles, isActive, or password.
 */
export async function updateProfile(
  userId: string,
  data: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    favoriteTerminalIds?: string[];
  },
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<UserPublic> {
  const updated = await updateUserDb(userId, {
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    favoriteTerminalIds: data.favoriteTerminalIds,
  });
  if (!updated) {
    throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'profile_update',
    entityType: 'user',
    entityId: userId,
    userId,
    userEmail: updated.email,
    summary: `User ${updated.email} updated their profile`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return updated;
}

export async function changePassword(
  userId: string,
  data: PasswordChange,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new UserServiceError('Current password is incorrect', 'INVALID_PASSWORD', 400);
  }

  const newHash = await hashPassword(data.newPassword);
  await updatePasswordDb(userId, newHash);

  createAuditLog({
    eventType: 'password_change',
    entityType: 'user',
    entityId: userId,
    userId,
    userEmail: user.email,
    summary: `User ${user.email} changed their password`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

export async function listAllUsers(opts: {
  limit: number;
  offset: number;
}): Promise<{ users: UserPublic[]; total: number }> {
  return listUsersDb(opts);
}

export async function getUserById(id: string): Promise<UserPublic> {
  const user = await findUserPublicById(id);
  if (!user) {
    throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
  }
  return user;
}

/**
 * Admin update — can change roles, isActive, etc.
 */
export async function adminUpdateUser(
  targetUserId: string,
  data: UserUpdate,
  adminUserId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<UserPublic> {
  const updated = await updateUserDb(targetUserId, data);
  if (!updated) {
    throw new UserServiceError('User not found', 'USER_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'user',
    entityId: targetUserId,
    userId: adminUserId,
    userEmail: updated.email,
    summary: `Admin updated user ${updated.email}`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return updated;
}
