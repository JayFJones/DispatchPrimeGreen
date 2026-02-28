import type { Route, RouteCreate, RouteUpdate } from '@dispatch/shared/types/route';
import sql from '../client.js';

const ROUTE_COLUMNS = sql`
  id,
  trkid,
  terminal_id        AS "terminalId",
  leg_number         AS "legNumber",
  truck_number       AS "truckNumber",
  sub_unit_number    AS "subUnitNumber",
  default_driver_id  AS "defaultDriverId",
  fuel_card          AS "fuelCard",
  scanner,
  departure_time     AS "departureTime",
  sun, mon, tue, wed, thu, fri, sat,
  total_stops        AS "totalStops",
  estimated_duration::float8 AS "estimatedDuration",
  estimated_distance::float8 AS "estimatedDistance",
  created_at         AS "createdAt",
  updated_at         AS "updatedAt"
`;

export async function findRouteById(id: string): Promise<Route | undefined> {
  const rows = await sql`
    SELECT ${ROUTE_COLUMNS}
    FROM routes
    WHERE id = ${id}
  `;
  return rows[0] as Route | undefined;
}

export async function findRouteByTrkid(trkid: string): Promise<Route | undefined> {
  const rows = await sql`
    SELECT ${ROUTE_COLUMNS}
    FROM routes
    WHERE trkid = ${trkid}
  `;
  return rows[0] as Route | undefined;
}

export async function listRoutesByTerminal(terminalId: string): Promise<Route[]> {
  const rows = await sql`
    SELECT ${ROUTE_COLUMNS}
    FROM routes
    WHERE terminal_id = ${terminalId}
    ORDER BY trkid ASC
  `;
  return rows as unknown as Route[];
}

export async function listRoutesForDay(
  terminalId: string,
  dayColumn: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
): Promise<Route[]> {
  const rows = await sql`
    SELECT ${ROUTE_COLUMNS}
    FROM routes
    WHERE terminal_id = ${terminalId}
      AND ${sql(dayColumn)} = true
    ORDER BY departure_time ASC NULLS LAST, trkid ASC
  `;
  return rows as unknown as Route[];
}

export async function createRoute(data: RouteCreate): Promise<Route> {
  const rows = await sql`
    INSERT INTO routes (
      trkid,
      terminal_id,
      leg_number,
      truck_number,
      sub_unit_number,
      default_driver_id,
      fuel_card,
      scanner,
      departure_time,
      sun, mon, tue, wed, thu, fri, sat,
      total_stops,
      estimated_duration,
      estimated_distance
    ) VALUES (
      ${data.trkid},
      ${data.terminalId},
      ${data.legNumber ?? null},
      ${data.truckNumber ?? null},
      ${data.subUnitNumber ?? null},
      ${data.defaultDriverId ?? null},
      ${data.fuelCard ?? null},
      ${data.scanner ?? null},
      ${data.departureTime ?? null},
      ${data.sun ?? false},
      ${data.mon ?? false},
      ${data.tue ?? false},
      ${data.wed ?? false},
      ${data.thu ?? false},
      ${data.fri ?? false},
      ${data.sat ?? false},
      ${data.totalStops ?? 0},
      ${data.estimatedDuration ?? null},
      ${data.estimatedDistance ?? null}
    )
    RETURNING ${ROUTE_COLUMNS}
  `;
  return rows[0] as Route;
}

export async function updateRoute(
  id: string,
  data: RouteUpdate,
): Promise<Route | undefined> {
  const values: Record<string, unknown> = {};

  if (data.trkid !== undefined) values['trkid'] = data.trkid;
  if (data.legNumber !== undefined) values['leg_number'] = data.legNumber;
  if (data.truckNumber !== undefined) values['truck_number'] = data.truckNumber;
  if (data.subUnitNumber !== undefined) values['sub_unit_number'] = data.subUnitNumber;
  if (data.defaultDriverId !== undefined) values['default_driver_id'] = data.defaultDriverId;
  if (data.fuelCard !== undefined) values['fuel_card'] = data.fuelCard;
  if (data.scanner !== undefined) values['scanner'] = data.scanner;
  if (data.departureTime !== undefined) values['departure_time'] = data.departureTime;
  if (data.sun !== undefined) values['sun'] = data.sun;
  if (data.mon !== undefined) values['mon'] = data.mon;
  if (data.tue !== undefined) values['tue'] = data.tue;
  if (data.wed !== undefined) values['wed'] = data.wed;
  if (data.thu !== undefined) values['thu'] = data.thu;
  if (data.fri !== undefined) values['fri'] = data.fri;
  if (data.sat !== undefined) values['sat'] = data.sat;
  if (data.totalStops !== undefined) values['total_stops'] = data.totalStops;
  if (data.estimatedDuration !== undefined) values['estimated_duration'] = data.estimatedDuration;
  if (data.estimatedDistance !== undefined) values['estimated_distance'] = data.estimatedDistance;

  if (Object.keys(values).length === 0) {
    return findRouteById(id);
  }

  const rows = await sql`
    UPDATE routes SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${ROUTE_COLUMNS}
  `;
  return rows[0] as Route | undefined;
}

export async function deleteRoute(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM routes WHERE id = ${id}
  `;
  return result.count > 0;
}
