import type {
  RouteSubstitution,
  RouteSubstitutionCreate,
  RouteSubstitutionUpdate,
} from '@dispatch/shared/types/route-substitution';
import sql from '../client.js';

const SUBSTITUTION_COLUMNS = sql`
  id,
  route_id                  AS "routeId",
  start_date                AS "startDate",
  end_date                  AS "endDate",
  driver_id                 AS "driverId",
  truck_number              AS "truckNumber",
  sub_unit_number           AS "subUnitNumber",
  scanner,
  fuel_card                 AS "fuelCard",
  route_stops_modifications AS "routeStopsModifications",
  reason,
  created_by                AS "createdBy",
  notes,
  created_at                AS "createdAt",
  updated_at                AS "updatedAt"
`;

export async function findRouteSubstitutionById(
  id: string,
): Promise<RouteSubstitution | undefined> {
  const rows = await sql`
    SELECT ${SUBSTITUTION_COLUMNS}
    FROM route_substitutions
    WHERE id = ${id}
  `;
  return rows[0] as RouteSubstitution | undefined;
}

export async function listByRoute(routeId: string): Promise<RouteSubstitution[]> {
  const rows = await sql`
    SELECT ${SUBSTITUTION_COLUMNS}
    FROM route_substitutions
    WHERE route_id = ${routeId}
    ORDER BY start_date DESC
  `;
  return rows as unknown as RouteSubstitution[];
}

export async function findActiveSubstitution(
  routeId: string,
  date: string,
): Promise<RouteSubstitution | undefined> {
  const rows = await sql`
    SELECT ${SUBSTITUTION_COLUMNS}
    FROM route_substitutions
    WHERE route_id = ${routeId}
      AND start_date <= ${date}
      AND end_date >= ${date}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] as RouteSubstitution | undefined;
}

export async function createRouteSubstitution(
  data: RouteSubstitutionCreate,
): Promise<RouteSubstitution> {
  const rows = await sql`
    INSERT INTO route_substitutions (
      route_id,
      start_date,
      end_date,
      driver_id,
      truck_number,
      sub_unit_number,
      scanner,
      fuel_card,
      route_stops_modifications,
      reason,
      created_by,
      notes
    ) VALUES (
      ${data.routeId},
      ${data.startDate},
      ${data.endDate},
      ${data.driverId ?? null},
      ${data.truckNumber ?? null},
      ${data.subUnitNumber ?? null},
      ${data.scanner ?? null},
      ${data.fuelCard ?? null},
      ${data.routeStopsModifications ? sql.json(data.routeStopsModifications as unknown as Parameters<typeof sql.json>[0]) : null},
      ${data.reason ?? null},
      ${data.createdBy ?? null},
      ${data.notes ?? null}
    )
    RETURNING ${SUBSTITUTION_COLUMNS}
  `;
  return rows[0] as RouteSubstitution;
}

export async function updateRouteSubstitution(
  id: string,
  data: RouteSubstitutionUpdate,
): Promise<RouteSubstitution | undefined> {
  const values: Record<string, unknown> = {};

  if (data.startDate !== undefined) values['start_date'] = data.startDate;
  if (data.endDate !== undefined) values['end_date'] = data.endDate;
  if (data.driverId !== undefined) values['driver_id'] = data.driverId;
  if (data.truckNumber !== undefined) values['truck_number'] = data.truckNumber;
  if (data.subUnitNumber !== undefined) values['sub_unit_number'] = data.subUnitNumber;
  if (data.scanner !== undefined) values['scanner'] = data.scanner;
  if (data.fuelCard !== undefined) values['fuel_card'] = data.fuelCard;
  if (data.routeStopsModifications !== undefined) {
    values['route_stops_modifications'] = data.routeStopsModifications
      ? sql.json(data.routeStopsModifications as unknown as Parameters<typeof sql.json>[0])
      : null;
  }
  if (data.reason !== undefined) values['reason'] = data.reason;
  if (data.createdBy !== undefined) values['created_by'] = data.createdBy;
  if (data.notes !== undefined) values['notes'] = data.notes;

  if (Object.keys(values).length === 0) {
    return findRouteSubstitutionById(id);
  }

  const rows = await sql`
    UPDATE route_substitutions SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${SUBSTITUTION_COLUMNS}
  `;
  return rows[0] as RouteSubstitution | undefined;
}

export async function deleteRouteSubstitution(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM route_substitutions WHERE id = ${id}
  `;
  return result.count > 0;
}
