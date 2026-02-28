import type {
  DispatchEventStop,
  DispatchEventStopCreate,
  DispatchEventStopUpdate,
} from '@dispatch/shared/types/dispatch-event-stop';
import sql from '../client.js';

const STOP_COLUMNS = sql`
  id,
  dispatch_event_id     AS "dispatchEventId",
  route_stop_id         AS "routeStopId",
  sequence,
  planned_eta           AS "plannedEta",
  planned_etd           AS "plannedEtd",
  actual_arrival_time   AS "actualArrivalTime",
  actual_departure_time AS "actualDepartureTime",
  service_time::float8  AS "serviceTime",
  status,
  on_time_status        AS "onTimeStatus",
  latitude::float8,
  longitude::float8,
  odometer::float8,
  fuel_used::float8     AS "fuelUsed",
  notes,
  exception_reason      AS "exceptionReason",
  skip_reason           AS "skipReason",
  requires_attention    AS "requiresAttention",
  created_at            AS "createdAt",
  updated_at            AS "updatedAt"
`;

export async function findDispatchEventStopById(
  id: string,
): Promise<DispatchEventStop | undefined> {
  const rows = await sql`
    SELECT ${STOP_COLUMNS}
    FROM dispatch_event_stops
    WHERE id = ${id}
  `;
  return rows[0] as DispatchEventStop | undefined;
}

export async function listByDispatchEvent(
  dispatchEventId: string,
): Promise<DispatchEventStop[]> {
  const rows = await sql`
    SELECT ${STOP_COLUMNS}
    FROM dispatch_event_stops
    WHERE dispatch_event_id = ${dispatchEventId}
    ORDER BY sequence ASC
  `;
  return rows as unknown as DispatchEventStop[];
}

export async function createDispatchEventStop(
  data: DispatchEventStopCreate,
): Promise<DispatchEventStop> {
  const rows = await sql`
    INSERT INTO dispatch_event_stops (
      dispatch_event_id,
      route_stop_id,
      sequence,
      planned_eta,
      planned_etd,
      status,
      requires_attention
    ) VALUES (
      ${data.dispatchEventId},
      ${data.routeStopId ?? null},
      ${data.sequence},
      ${data.plannedEta ?? null},
      ${data.plannedEtd ?? null},
      ${data.status ?? 'pending'},
      ${data.requiresAttention ?? false}
    )
    RETURNING ${STOP_COLUMNS}
  `;
  return rows[0] as DispatchEventStop;
}

export async function createDispatchEventStops(
  stops: DispatchEventStopCreate[],
): Promise<DispatchEventStop[]> {
  if (stops.length === 0) return [];

  const values = stops.map((s) => ({
    dispatch_event_id: s.dispatchEventId,
    route_stop_id: s.routeStopId ?? null,
    sequence: s.sequence,
    planned_eta: s.plannedEta ?? null,
    planned_etd: s.plannedEtd ?? null,
    status: s.status ?? 'pending',
    requires_attention: s.requiresAttention ?? false,
  }));

  const rows = await sql`
    INSERT INTO dispatch_event_stops ${sql(values)}
    RETURNING ${STOP_COLUMNS}
  `;
  return rows as unknown as DispatchEventStop[];
}

export async function updateDispatchEventStop(
  id: string,
  data: DispatchEventStopUpdate,
): Promise<DispatchEventStop | undefined> {
  const values: Record<string, unknown> = {};

  if (data.actualArrivalTime !== undefined) values['actual_arrival_time'] = data.actualArrivalTime;
  if (data.actualDepartureTime !== undefined) values['actual_departure_time'] = data.actualDepartureTime;
  if (data.serviceTime !== undefined) values['service_time'] = data.serviceTime;
  if (data.status !== undefined) values['status'] = data.status;
  if (data.onTimeStatus !== undefined) values['on_time_status'] = data.onTimeStatus;
  if (data.latitude !== undefined) values['latitude'] = data.latitude;
  if (data.longitude !== undefined) values['longitude'] = data.longitude;
  if (data.odometer !== undefined) values['odometer'] = data.odometer;
  if (data.fuelUsed !== undefined) values['fuel_used'] = data.fuelUsed;
  if (data.notes !== undefined) values['notes'] = data.notes;
  if (data.exceptionReason !== undefined) values['exception_reason'] = data.exceptionReason;
  if (data.skipReason !== undefined) values['skip_reason'] = data.skipReason;
  if (data.requiresAttention !== undefined) values['requires_attention'] = data.requiresAttention;

  if (Object.keys(values).length === 0) {
    return findDispatchEventStopById(id);
  }

  const rows = await sql`
    UPDATE dispatch_event_stops SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${STOP_COLUMNS}
  `;
  return rows[0] as DispatchEventStop | undefined;
}

export async function countCompletedStops(dispatchEventId: string): Promise<{
  total: number;
  completed: number;
  onTime: number;
}> {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('completed', 'skipped', 'exception'))::int AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE on_time_status IN ('early', 'on_time'))::int AS "onTime"
    FROM dispatch_event_stops
    WHERE dispatch_event_id = ${dispatchEventId}
  `;
  return rows[0] as { total: number; completed: number; onTime: number };
}
