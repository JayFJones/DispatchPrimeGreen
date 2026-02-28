import type { RouteStop, RouteStopCreate, RouteStopUpdate } from '@dispatch/shared/types/route-stop';
import sql from '../client.js';

const ROUTE_STOP_COLUMNS = sql`
  id,
  route_id       AS "routeId",
  customer_id    AS "customerId",
  sequence,
  cid,
  cust_name      AS "custName",
  address,
  city,
  state,
  zip_code       AS "zipCode",
  latitude::float8,
  longitude::float8,
  eta,
  etd,
  commit_time    AS "commitTime",
  fixed_time     AS "fixedTime",
  cube,
  timezone,
  open_time      AS "openTime",
  close_time     AS "closeTime",
  lanter_id      AS "lanterId",
  customer_pdc   AS "customerPdc",
  geo_result     AS "geoResult",
  created_at     AS "createdAt",
  updated_at     AS "updatedAt"
`;

export async function findRouteStopById(id: string): Promise<RouteStop | undefined> {
  const rows = await sql`
    SELECT ${ROUTE_STOP_COLUMNS}
    FROM route_stops
    WHERE id = ${id}
  `;
  return rows[0] as RouteStop | undefined;
}

export async function listRouteStopsByRoute(routeId: string): Promise<RouteStop[]> {
  const rows = await sql`
    SELECT ${ROUTE_STOP_COLUMNS}
    FROM route_stops
    WHERE route_id = ${routeId}
    ORDER BY sequence ASC
  `;
  return rows as unknown as RouteStop[];
}

export async function createRouteStop(data: RouteStopCreate): Promise<RouteStop> {
  const rows = await sql`
    INSERT INTO route_stops (
      route_id, customer_id, sequence, cid, cust_name,
      address, city, state, zip_code, latitude, longitude,
      eta, etd, commit_time, fixed_time, cube, timezone,
      open_time, close_time, lanter_id, customer_pdc, geo_result
    ) VALUES (
      ${data.routeId},
      ${data.customerId ?? null},
      ${data.sequence},
      ${data.cid ?? null},
      ${data.custName ?? null},
      ${data.address ?? null},
      ${data.city ?? null},
      ${data.state ?? null},
      ${data.zipCode ?? null},
      ${data.latitude ?? null},
      ${data.longitude ?? null},
      ${data.eta ?? null},
      ${data.etd ?? null},
      ${data.commitTime ?? null},
      ${data.fixedTime ?? null},
      ${data.cube ?? null},
      ${data.timezone ?? null},
      ${data.openTime ?? null},
      ${data.closeTime ?? null},
      ${data.lanterId ?? null},
      ${data.customerPdc ?? null},
      ${data.geoResult ?? null}
    )
    RETURNING ${ROUTE_STOP_COLUMNS}
  `;
  return rows[0] as RouteStop;
}

export async function createRouteStops(stops: RouteStopCreate[]): Promise<RouteStop[]> {
  if (stops.length === 0) return [];

  const values = stops.map((s) => ({
    route_id: s.routeId,
    customer_id: s.customerId ?? null,
    sequence: s.sequence,
    cid: s.cid ?? null,
    cust_name: s.custName ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state ?? null,
    zip_code: s.zipCode ?? null,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    eta: s.eta ?? null,
    etd: s.etd ?? null,
    commit_time: s.commitTime ?? null,
    fixed_time: s.fixedTime ?? null,
    cube: s.cube ?? null,
    timezone: s.timezone ?? null,
    open_time: s.openTime ?? null,
    close_time: s.closeTime ?? null,
    lanter_id: s.lanterId ?? null,
    customer_pdc: s.customerPdc ?? null,
    geo_result: s.geoResult ?? null,
  }));

  const rows = await sql`
    INSERT INTO route_stops ${sql(values)}
    RETURNING ${ROUTE_STOP_COLUMNS}
  `;
  return rows as unknown as RouteStop[];
}

export async function updateRouteStop(
  id: string,
  data: RouteStopUpdate,
): Promise<RouteStop | undefined> {
  const values: Record<string, unknown> = {};

  if (data.customerId !== undefined) values['customer_id'] = data.customerId;
  if (data.sequence !== undefined) values['sequence'] = data.sequence;
  if (data.cid !== undefined) values['cid'] = data.cid;
  if (data.custName !== undefined) values['cust_name'] = data.custName;
  if (data.address !== undefined) values['address'] = data.address;
  if (data.city !== undefined) values['city'] = data.city;
  if (data.state !== undefined) values['state'] = data.state;
  if (data.zipCode !== undefined) values['zip_code'] = data.zipCode;
  if (data.latitude !== undefined) values['latitude'] = data.latitude;
  if (data.longitude !== undefined) values['longitude'] = data.longitude;
  if (data.eta !== undefined) values['eta'] = data.eta;
  if (data.etd !== undefined) values['etd'] = data.etd;
  if (data.commitTime !== undefined) values['commit_time'] = data.commitTime;
  if (data.fixedTime !== undefined) values['fixed_time'] = data.fixedTime;
  if (data.cube !== undefined) values['cube'] = data.cube;
  if (data.timezone !== undefined) values['timezone'] = data.timezone;
  if (data.openTime !== undefined) values['open_time'] = data.openTime;
  if (data.closeTime !== undefined) values['close_time'] = data.closeTime;
  if (data.lanterId !== undefined) values['lanter_id'] = data.lanterId;
  if (data.customerPdc !== undefined) values['customer_pdc'] = data.customerPdc;
  if (data.geoResult !== undefined) values['geo_result'] = data.geoResult;

  if (Object.keys(values).length === 0) {
    return findRouteStopById(id);
  }

  const rows = await sql`
    UPDATE route_stops SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${ROUTE_STOP_COLUMNS}
  `;
  return rows[0] as RouteStop | undefined;
}

export async function deleteRouteStop(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM route_stops WHERE id = ${id}
  `;
  return result.count > 0;
}

export async function countRouteStopsByRoute(routeId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM route_stops
    WHERE route_id = ${routeId}
  `;
  return (rows[0] as { count: number }).count;
}
