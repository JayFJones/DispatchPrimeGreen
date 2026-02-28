import type { Availability, AvailabilityCreate, AvailabilityUpdate } from '@dispatch/shared/types/availability';
import sql from '../client.js';

const AVAILABILITY_COLUMNS = sql`
  id,
  driver_id          AS "driverId",
  start_date         AS "startDate",
  end_date           AS "endDate",
  availability_type  AS "availabilityType",
  reason,
  notes,
  user_id            AS "userId",
  created_at         AS "createdAt",
  updated_at         AS "updatedAt"
`;

export async function findAvailabilityById(id: string): Promise<Availability | undefined> {
  const rows = await sql`
    SELECT ${AVAILABILITY_COLUMNS}
    FROM availability
    WHERE id = ${id}
  `;
  return rows[0] as Availability | undefined;
}

export async function listByDriver(driverId: string): Promise<Availability[]> {
  const rows = await sql`
    SELECT ${AVAILABILITY_COLUMNS}
    FROM availability
    WHERE driver_id = ${driverId}
    ORDER BY start_date DESC
  `;
  return rows as unknown as Availability[];
}

/** List drivers who have a non-available record overlapping the given date, scoped to a terminal */
export async function listUnavailableDrivers(
  terminalId: string,
  date: string,
): Promise<Availability[]> {
  const rows = await sql`
    SELECT
      a.id,
      a.driver_id          AS "driverId",
      a.start_date         AS "startDate",
      a.end_date           AS "endDate",
      a.availability_type  AS "availabilityType",
      a.reason,
      a.notes,
      a.user_id            AS "userId",
      a.created_at         AS "createdAt",
      a.updated_at         AS "updatedAt"
    FROM availability a
    INNER JOIN terminal_drivers td ON td.driver_id = a.driver_id
    WHERE td.terminal_id = ${terminalId}
      AND a.availability_type != 'available'
      AND a.start_date <= ${date}
      AND a.end_date >= ${date}
    ORDER BY a.start_date ASC
  `;
  return rows as unknown as Availability[];
}

export async function createAvailability(data: AvailabilityCreate): Promise<Availability> {
  const rows = await sql`
    INSERT INTO availability (
      driver_id,
      start_date,
      end_date,
      availability_type,
      reason,
      notes,
      user_id
    ) VALUES (
      ${data.driverId},
      ${data.startDate},
      ${data.endDate},
      ${data.availabilityType},
      ${data.reason ?? null},
      ${data.notes ?? null},
      ${data.userId ?? null}
    )
    RETURNING ${AVAILABILITY_COLUMNS}
  `;
  return rows[0] as Availability;
}

export async function updateAvailability(
  id: string,
  data: AvailabilityUpdate,
): Promise<Availability | undefined> {
  const values: Record<string, unknown> = {};

  if (data.startDate !== undefined) values['start_date'] = data.startDate;
  if (data.endDate !== undefined) values['end_date'] = data.endDate;
  if (data.availabilityType !== undefined) values['availability_type'] = data.availabilityType;
  if (data.reason !== undefined) values['reason'] = data.reason;
  if (data.notes !== undefined) values['notes'] = data.notes;
  if (data.userId !== undefined) values['user_id'] = data.userId;

  if (Object.keys(values).length === 0) {
    return findAvailabilityById(id);
  }

  const rows = await sql`
    UPDATE availability SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${AVAILABILITY_COLUMNS}
  `;
  return rows[0] as Availability | undefined;
}

export async function deleteAvailability(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM availability WHERE id = ${id}
  `;
  return result.count > 0;
}

export async function isDriverAvailable(driverId: string, date: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM availability
    WHERE driver_id = ${driverId}
      AND availability_type != 'available'
      AND start_date <= ${date}
      AND end_date >= ${date}
    LIMIT 1
  `;
  return rows.length === 0;
}
