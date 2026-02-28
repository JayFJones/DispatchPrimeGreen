import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RoleSchema } from '@dispatch/shared/constants/roles';

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  roles: z.array(RoleSchema),
  homeTerminalId: z.string().uuid().nullable(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getSecret(envKey: string): string {
  const secret = process.env[envKey];
  if (!secret) {
    throw new Error(`${envKey} environment variable is required`);
  }
  return secret;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('JWT_SECRET'), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret('REFRESH_TOKEN_SECRET'), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret('JWT_SECRET'));
  return JwtPayloadSchema.parse(decoded);
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret('REFRESH_TOKEN_SECRET'));
  return JwtPayloadSchema.parse(decoded);
}
