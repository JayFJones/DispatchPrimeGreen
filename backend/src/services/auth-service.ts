import { hashPassword, verifyPassword } from '../auth/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type JwtPayload,
} from '../auth/jwt.js';
import { findUserByEmail, createUser, updateLastLoggedIn } from '../db/queries/users.js';
import { createAuditLog } from '../db/queries/audit-logs.js';
import type { UserCreate } from '@dispatch/shared/types/user';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function buildJwtPayload(user: {
  id: string;
  email: string;
  roles: string[];
  homeTerminalId: string | null;
}): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    roles: user.roles as JwtPayload['roles'],
    homeTerminalId: user.homeTerminalId,
  };
}

export async function login(
  email: string,
  password: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload }> {
  const user = await findUserByEmail(email);

  if (!user) {
    await createAuditLog({
      eventType: 'failed_login',
      entityType: 'user',
      summary: `Failed login attempt for ${email} — user not found`,
      userEmail: email,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  if (!user.isActive) {
    await createAuditLog({
      eventType: 'failed_login',
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
      userEmail: user.email,
      summary: `Failed login attempt for ${email} — account deactivated`,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    throw new AuthError('Account is deactivated', 'ACCOUNT_DEACTIVATED', 403);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await createAuditLog({
      eventType: 'failed_login',
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
      userEmail: user.email,
      summary: `Failed login attempt for ${email} — wrong password`,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  const payload = buildJwtPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Non-blocking: update last login time and audit
  updateLastLoggedIn(user.id).catch(() => {});
  createAuditLog({
    eventType: 'login',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    userEmail: user.email,
    summary: `User ${email} logged in`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return { accessToken, refreshToken, user: payload };
}

export async function refresh(
  refreshTokenValue: string,
): Promise<{ accessToken: string; user: JwtPayload }> {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401);
  }

  // Re-fetch user to get current roles (may have changed since token was issued)
  const user = await findUserByEmail(payload.email);
  if (!user) {
    throw new AuthError('User no longer exists', 'USER_NOT_FOUND', 401);
  }
  if (!user.isActive) {
    throw new AuthError('Account is deactivated', 'ACCOUNT_DEACTIVATED', 403);
  }

  const freshPayload = buildJwtPayload(user);
  const accessToken = generateAccessToken(freshPayload);
  return { accessToken, user: freshPayload };
}

export async function register(
  data: UserCreate,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload }> {
  // TODO: Lock behind requireRole('system_admin') for production
  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new AuthError('A user with this email already exists', 'DUPLICATE_EMAIL', 409);
  }

  const passwordHash = await hashPassword(data.password);

  const user = await createUser({
    email: data.email,
    passwordHash,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    roles: data.roles,
    homeTerminalId: data.homeTerminalId ?? null,
    isActive: data.isActive ?? true,
  });

  const payload = buildJwtPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    userEmail: user.email,
    summary: `New user registered: ${data.email}`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return { accessToken, refreshToken, user: payload };
}
