import type { GeotabSession, GeotabSessionPublic } from '@dispatch/shared/types/geotab-session';
import sql from '../client.js';

const SESSION_COLUMNS = sql`
  id,
  user_id              AS "userId",
  database,
  username,
  encrypted_password   AS "encryptedPassword",
  session_id           AS "sessionId",
  server,
  is_authenticated     AS "isAuthenticated",
  last_authenticated   AS "lastAuthenticated",
  auth_expiry          AS "authExpiry",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

const SESSION_PUBLIC_COLUMNS = sql`
  id,
  user_id              AS "userId",
  database,
  username,
  session_id           AS "sessionId",
  server,
  is_authenticated     AS "isAuthenticated",
  last_authenticated   AS "lastAuthenticated",
  auth_expiry          AS "authExpiry",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

/** Find the full session (including encrypted password) for a user */
export async function findSessionByUserId(userId: string): Promise<GeotabSession | undefined> {
  const rows = await sql`
    SELECT ${SESSION_COLUMNS}
    FROM geotab_sessions
    WHERE user_id = ${userId}
  `;
  return rows[0] as GeotabSession | undefined;
}

/** Find the public session data (no encrypted password) for a user */
export async function findSessionPublicByUserId(userId: string): Promise<GeotabSessionPublic | undefined> {
  const rows = await sql`
    SELECT ${SESSION_PUBLIC_COLUMNS}
    FROM geotab_sessions
    WHERE user_id = ${userId}
  `;
  return rows[0] as GeotabSessionPublic | undefined;
}

/** Insert or update a Geotab session for a user */
export async function upsertSession(data: {
  userId: string;
  database: string;
  username: string;
  encryptedPassword: string;
  sessionId: string;
  server: string;
  authExpiry: Date;
}): Promise<GeotabSessionPublic> {
  const rows = await sql`
    INSERT INTO geotab_sessions (
      user_id,
      database,
      username,
      encrypted_password,
      session_id,
      server,
      is_authenticated,
      last_authenticated,
      auth_expiry
    ) VALUES (
      ${data.userId},
      ${data.database},
      ${data.username},
      ${data.encryptedPassword},
      ${data.sessionId},
      ${data.server},
      true,
      NOW(),
      ${data.authExpiry}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      database = EXCLUDED.database,
      username = EXCLUDED.username,
      encrypted_password = EXCLUDED.encrypted_password,
      session_id = EXCLUDED.session_id,
      server = EXCLUDED.server,
      is_authenticated = true,
      last_authenticated = NOW(),
      auth_expiry = EXCLUDED.auth_expiry,
      updated_at = NOW()
    RETURNING ${SESSION_PUBLIC_COLUMNS}
  `;
  return rows[0] as GeotabSessionPublic;
}

/** Update just the session token and expiry (used after re-authentication) */
export async function updateSessionToken(
  userId: string,
  sessionId: string,
  server: string,
  authExpiry: Date,
): Promise<void> {
  await sql`
    UPDATE geotab_sessions SET
      session_id = ${sessionId},
      server = ${server},
      is_authenticated = true,
      last_authenticated = NOW(),
      auth_expiry = ${authExpiry},
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

/** Mark a session as unauthenticated (e.g., after credential failure) */
export async function markSessionUnauthenticated(userId: string): Promise<void> {
  await sql`
    UPDATE geotab_sessions SET
      is_authenticated = false,
      session_id = NULL,
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;
}

/** Delete a Geotab session entirely (user removes their Geotab credentials) */
export async function deleteSession(userId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM geotab_sessions
    WHERE user_id = ${userId}
  `;
  return result.count > 0;
}
