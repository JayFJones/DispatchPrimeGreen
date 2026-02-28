import type { Terminal, TerminalCreate, TerminalUpdate } from '@dispatch/shared/types/terminal';
import sql from '../client.js';

const TERMINAL_COLUMNS = sql`
  id,
  name,
  slug,
  agent,
  dcp,
  city,
  state,
  street_address     AS "streetAddress",
  street_address2    AS "streetAddress2",
  zip,
  country,
  latitude::float8   AS latitude,
  longitude::float8  AS longitude,
  timezone,
  geotab_group_id    AS "geotabGroupId",
  terminal_type      AS "terminalType",
  worklist,
  leaders,
  created_at         AS "createdAt",
  updated_at         AS "updatedAt"
`;

export async function findTerminalById(id: string): Promise<Terminal | undefined> {
  const rows = await sql`
    SELECT ${TERMINAL_COLUMNS}
    FROM terminals
    WHERE id = ${id}
  `;
  return rows[0] as Terminal | undefined;
}

export async function findTerminalBySlug(slug: string): Promise<Terminal | undefined> {
  const rows = await sql`
    SELECT ${TERMINAL_COLUMNS}
    FROM terminals
    WHERE slug = ${slug}
  `;
  return rows[0] as Terminal | undefined;
}

export async function listTerminals(): Promise<Terminal[]> {
  const rows = await sql`
    SELECT ${TERMINAL_COLUMNS}
    FROM terminals
    ORDER BY name ASC
  `;
  return rows as unknown as Terminal[];
}

export async function listTerminalsByIds(ids: string[]): Promise<Terminal[]> {
  if (ids.length === 0) return [];
  const rows = await sql`
    SELECT ${TERMINAL_COLUMNS}
    FROM terminals
    WHERE id = ANY(${sql.array(ids)})
    ORDER BY name ASC
  `;
  return rows as unknown as Terminal[];
}

export async function createTerminal(data: TerminalCreate): Promise<Terminal> {
  const rows = await sql`
    INSERT INTO terminals (
      name,
      slug,
      agent,
      dcp,
      city,
      state,
      street_address,
      street_address2,
      zip,
      country,
      latitude,
      longitude,
      timezone,
      geotab_group_id,
      terminal_type,
      worklist,
      leaders
    ) VALUES (
      ${data.name},
      ${data.slug},
      ${data.agent ?? null},
      ${data.dcp ?? null},
      ${data.city ?? null},
      ${data.state ?? null},
      ${data.streetAddress ?? null},
      ${data.streetAddress2 ?? null},
      ${data.zip ?? null},
      ${data.country ?? null},
      ${data.latitude ?? null},
      ${data.longitude ?? null},
      ${data.timezone},
      ${data.geotabGroupId ?? null},
      ${data.terminalType},
      ${data.worklist ?? null},
      ${sql.json(data.leaders ?? [])}
    )
    RETURNING ${TERMINAL_COLUMNS}
  `;
  return rows[0] as Terminal;
}

export async function updateTerminal(
  id: string,
  data: TerminalUpdate,
): Promise<Terminal | undefined> {
  const values: Record<string, unknown> = {};

  if (data.name !== undefined) values['name'] = data.name;
  if (data.slug !== undefined) values['slug'] = data.slug;
  if (data.agent !== undefined) values['agent'] = data.agent;
  if (data.dcp !== undefined) values['dcp'] = data.dcp;
  if (data.city !== undefined) values['city'] = data.city;
  if (data.state !== undefined) values['state'] = data.state;
  if (data.streetAddress !== undefined) values['street_address'] = data.streetAddress;
  if (data.streetAddress2 !== undefined) values['street_address2'] = data.streetAddress2;
  if (data.zip !== undefined) values['zip'] = data.zip;
  if (data.country !== undefined) values['country'] = data.country;
  if (data.latitude !== undefined) values['latitude'] = data.latitude;
  if (data.longitude !== undefined) values['longitude'] = data.longitude;
  if (data.timezone !== undefined) values['timezone'] = data.timezone;
  if (data.geotabGroupId !== undefined) values['geotab_group_id'] = data.geotabGroupId;
  if (data.terminalType !== undefined) values['terminal_type'] = data.terminalType;
  if (data.worklist !== undefined) values['worklist'] = data.worklist;
  if (data.leaders !== undefined) values['leaders'] = sql.json(data.leaders);

  if (Object.keys(values).length === 0) {
    return findTerminalById(id);
  }

  const rows = await sql`
    UPDATE terminals SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${TERMINAL_COLUMNS}
  `;
  return rows[0] as Terminal | undefined;
}

export async function deleteTerminal(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM terminals
    WHERE id = ${id}
  `;
  return result.count > 0;
}
