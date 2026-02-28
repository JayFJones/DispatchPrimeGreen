import type { UserPublic, UserCreate, UserUpdate } from '@dispatch/shared/types/user';
import sql from '../client.js';

export async function findUserByEmail(
  email: string,
): Promise<
  | (UserPublic & { passwordHash: string })
  | undefined
> {
  const rows = await sql`
    SELECT
      id,
      email,
      password_hash   AS "passwordHash",
      first_name      AS "firstName",
      last_name       AS "lastName",
      roles,
      home_terminal_id      AS "homeTerminalId",
      favorite_terminal_ids AS "favoriteTerminalIds",
      is_active       AS "isActive",
      last_logged_in  AS "lastLoggedIn",
      created_at      AS "createdAt",
      updated_at      AS "updatedAt"
    FROM users
    WHERE email = ${email}
  `;
  return rows[0] as
    | (UserPublic & { passwordHash: string })
    | undefined;
}

export async function findUserById(
  id: string,
): Promise<
  | (UserPublic & { passwordHash: string })
  | undefined
> {
  const rows = await sql`
    SELECT
      id,
      email,
      password_hash   AS "passwordHash",
      first_name      AS "firstName",
      last_name       AS "lastName",
      roles,
      home_terminal_id      AS "homeTerminalId",
      favorite_terminal_ids AS "favoriteTerminalIds",
      is_active       AS "isActive",
      last_logged_in  AS "lastLoggedIn",
      created_at      AS "createdAt",
      updated_at      AS "updatedAt"
    FROM users
    WHERE id = ${id}
  `;
  return rows[0] as
    | (UserPublic & { passwordHash: string })
    | undefined;
}

export async function findUserPublicById(
  id: string,
): Promise<UserPublic | undefined> {
  const rows = await sql`
    SELECT
      id,
      email,
      first_name      AS "firstName",
      last_name       AS "lastName",
      roles,
      home_terminal_id      AS "homeTerminalId",
      favorite_terminal_ids AS "favoriteTerminalIds",
      is_active       AS "isActive",
      last_logged_in  AS "lastLoggedIn",
      created_at      AS "createdAt",
      updated_at      AS "updatedAt"
    FROM users
    WHERE id = ${id}
  `;
  return rows[0] as UserPublic | undefined;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
  homeTerminalId?: string | null;
  isActive?: boolean;
}): Promise<UserPublic> {
  const rows = await sql`
    INSERT INTO users (
      email,
      password_hash,
      first_name,
      last_name,
      roles,
      home_terminal_id,
      is_active
    ) VALUES (
      ${data.email},
      ${data.passwordHash},
      ${data.firstName ?? null},
      ${data.lastName ?? null},
      ${sql.array(data.roles ?? [])},
      ${data.homeTerminalId ?? null},
      ${data.isActive ?? true}
    )
    RETURNING
      id,
      email,
      first_name      AS "firstName",
      last_name       AS "lastName",
      roles,
      home_terminal_id      AS "homeTerminalId",
      favorite_terminal_ids AS "favoriteTerminalIds",
      is_active       AS "isActive",
      last_logged_in  AS "lastLoggedIn",
      created_at      AS "createdAt",
      updated_at      AS "updatedAt"
  `;
  return rows[0] as UserPublic;
}

export async function updateUser(
  id: string,
  data: UserUpdate,
): Promise<UserPublic | undefined> {
  // Build SET clause dynamically from provided fields
  const setClauses: string[] = [];
  const values: Record<string, unknown> = {};

  if (data.email !== undefined) {
    values['email'] = data.email;
  }
  if (data.firstName !== undefined) {
    values['first_name'] = data.firstName;
  }
  if (data.lastName !== undefined) {
    values['last_name'] = data.lastName;
  }
  if (data.roles !== undefined) {
    values['roles'] = data.roles;
  }
  if (data.homeTerminalId !== undefined) {
    values['home_terminal_id'] = data.homeTerminalId;
  }
  if (data.favoriteTerminalIds !== undefined) {
    values['favorite_terminal_ids'] = data.favoriteTerminalIds;
  }
  if (data.isActive !== undefined) {
    values['is_active'] = data.isActive;
  }

  if (Object.keys(values).length === 0) {
    return findUserPublicById(id);
  }

  const rows = await sql`
    UPDATE users SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING
      id,
      email,
      first_name      AS "firstName",
      last_name       AS "lastName",
      roles,
      home_terminal_id      AS "homeTerminalId",
      favorite_terminal_ids AS "favoriteTerminalIds",
      is_active       AS "isActive",
      last_logged_in  AS "lastLoggedIn",
      created_at      AS "createdAt",
      updated_at      AS "updatedAt"
  `;
  return rows[0] as UserPublic | undefined;
}

export async function updatePassword(
  id: string,
  passwordHash: string,
): Promise<void> {
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${id}
  `;
}

export async function updateLastLoggedIn(id: string): Promise<void> {
  await sql`
    UPDATE users
    SET last_logged_in = NOW()
    WHERE id = ${id}
  `;
}

export async function listUsers(opts: {
  limit: number;
  offset: number;
}): Promise<{ users: UserPublic[]; total: number }> {
  const [countResult, rows] = await Promise.all([
    sql`SELECT count(*)::int AS total FROM users`,
    sql`
      SELECT
        id,
        email,
        first_name      AS "firstName",
        last_name       AS "lastName",
        roles,
        home_terminal_id      AS "homeTerminalId",
        favorite_terminal_ids AS "favoriteTerminalIds",
        is_active       AS "isActive",
        last_logged_in  AS "lastLoggedIn",
        created_at      AS "createdAt",
        updated_at      AS "updatedAt"
      FROM users
      ORDER BY created_at DESC
      LIMIT ${opts.limit}
      OFFSET ${opts.offset}
    `,
  ]);

  return {
    users: rows as unknown as UserPublic[],
    total: (countResult[0] as unknown as { total: number }).total,
  };
}
