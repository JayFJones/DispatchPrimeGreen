import type { DispatchEvent, DispatchEventCreate, DispatchEventUpdate } from '@dispatch/shared/types/dispatch-event';
import sql from '../client.js';

const DISPATCH_EVENT_COLUMNS = sql`
  id,
  route_id                  AS "routeId",
  terminal_id               AS "terminalId",
  execution_date            AS "executionDate",
  assigned_driver_id        AS "assignedDriverId",
  assigned_truck_id         AS "assignedTruckId",
  assigned_sub_unit_id      AS "assignedSubUnitId",
  status,
  priority,
  planned_departure_time    AS "plannedDepartureTime",
  actual_departure_time     AS "actualDepartureTime",
  estimated_return_time     AS "estimatedReturnTime",
  actual_return_time        AS "actualReturnTime",
  estimated_completion_time AS "estimatedCompletionTime",
  actual_completion_time    AS "actualCompletionTime",
  estimated_delay_minutes   AS "estimatedDelayMinutes",
  cancellation_reason       AS "cancellationReason",
  cancellation_notes        AS "cancellationNotes",
  dispatch_notes            AS "dispatchNotes",
  operational_notes         AS "operationalNotes",
  total_miles::float8       AS "totalMiles",
  total_service_time::float8 AS "totalServiceTime",
  fuel_used::float8         AS "fuelUsed",
  on_time_performance::float8 AS "onTimePerformance",
  last_location_update      AS "lastLocationUpdate",
  last_geotab_sync          AS "lastGeotabSync",
  created_at                AS "createdAt",
  updated_at                AS "updatedAt"
`;

export async function findDispatchEventById(id: string): Promise<DispatchEvent | undefined> {
  const rows = await sql`
    SELECT ${DISPATCH_EVENT_COLUMNS}
    FROM dispatch_events
    WHERE id = ${id}
  `;
  return rows[0] as DispatchEvent | undefined;
}

export async function findByRouteAndDate(
  routeId: string,
  executionDate: string,
): Promise<DispatchEvent | undefined> {
  const rows = await sql`
    SELECT ${DISPATCH_EVENT_COLUMNS}
    FROM dispatch_events
    WHERE route_id = ${routeId}
      AND execution_date = ${executionDate}
  `;
  return rows[0] as DispatchEvent | undefined;
}

export async function listByTerminal(
  terminalId: string,
  filters?: {
    date?: string;
    status?: string;
    driverId?: string;
  },
): Promise<DispatchEvent[]> {
  const rows = await sql`
    SELECT ${DISPATCH_EVENT_COLUMNS}
    FROM dispatch_events
    WHERE terminal_id = ${terminalId}
      ${filters?.date ? sql`AND execution_date = ${filters.date}` : sql``}
      ${filters?.status ? sql`AND status = ${filters.status}` : sql``}
      ${filters?.driverId ? sql`AND assigned_driver_id = ${filters.driverId}` : sql``}
    ORDER BY execution_date DESC, planned_departure_time ASC NULLS LAST
  `;
  return rows as unknown as DispatchEvent[];
}

export async function createDispatchEvent(data: DispatchEventCreate): Promise<DispatchEvent> {
  const rows = await sql`
    INSERT INTO dispatch_events (
      route_id,
      terminal_id,
      execution_date,
      assigned_driver_id,
      assigned_truck_id,
      assigned_sub_unit_id,
      status,
      priority,
      planned_departure_time,
      dispatch_notes,
      operational_notes
    ) VALUES (
      ${data.routeId},
      ${data.terminalId},
      ${data.executionDate},
      ${data.assignedDriverId ?? null},
      ${data.assignedTruckId ?? null},
      ${data.assignedSubUnitId ?? null},
      ${data.status ?? 'planned'},
      ${data.priority ?? 'normal'},
      ${data.plannedDepartureTime ?? null},
      ${data.dispatchNotes ?? null},
      ${data.operationalNotes ?? null}
    )
    RETURNING ${DISPATCH_EVENT_COLUMNS}
  `;
  return rows[0] as DispatchEvent;
}

export async function updateDispatchEvent(
  id: string,
  data: DispatchEventUpdate,
): Promise<DispatchEvent | undefined> {
  const values: Record<string, unknown> = {};

  if (data.assignedDriverId !== undefined) values['assigned_driver_id'] = data.assignedDriverId;
  if (data.assignedTruckId !== undefined) values['assigned_truck_id'] = data.assignedTruckId;
  if (data.assignedSubUnitId !== undefined) values['assigned_sub_unit_id'] = data.assignedSubUnitId;
  if (data.status !== undefined) values['status'] = data.status;
  if (data.priority !== undefined) values['priority'] = data.priority;
  if (data.plannedDepartureTime !== undefined) values['planned_departure_time'] = data.plannedDepartureTime;
  if (data.actualDepartureTime !== undefined) values['actual_departure_time'] = data.actualDepartureTime;
  if (data.estimatedReturnTime !== undefined) values['estimated_return_time'] = data.estimatedReturnTime;
  if (data.actualReturnTime !== undefined) values['actual_return_time'] = data.actualReturnTime;
  if (data.estimatedCompletionTime !== undefined) values['estimated_completion_time'] = data.estimatedCompletionTime;
  if (data.actualCompletionTime !== undefined) values['actual_completion_time'] = data.actualCompletionTime;
  if (data.estimatedDelayMinutes !== undefined) values['estimated_delay_minutes'] = data.estimatedDelayMinutes;
  if (data.cancellationReason !== undefined) values['cancellation_reason'] = data.cancellationReason;
  if (data.cancellationNotes !== undefined) values['cancellation_notes'] = data.cancellationNotes;
  if (data.dispatchNotes !== undefined) values['dispatch_notes'] = data.dispatchNotes;
  if (data.operationalNotes !== undefined) values['operational_notes'] = data.operationalNotes;
  if (data.totalMiles !== undefined) values['total_miles'] = data.totalMiles;
  if (data.totalServiceTime !== undefined) values['total_service_time'] = data.totalServiceTime;
  if (data.fuelUsed !== undefined) values['fuel_used'] = data.fuelUsed;
  if (data.onTimePerformance !== undefined) values['on_time_performance'] = data.onTimePerformance;
  if (data.lastLocationUpdate !== undefined) values['last_location_update'] = data.lastLocationUpdate;
  if (data.lastGeotabSync !== undefined) values['last_geotab_sync'] = data.lastGeotabSync;

  if (Object.keys(values).length === 0) {
    return findDispatchEventById(id);
  }

  const rows = await sql`
    UPDATE dispatch_events SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${DISPATCH_EVENT_COLUMNS}
  `;
  return rows[0] as DispatchEvent | undefined;
}

export async function deleteDispatchEvent(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM dispatch_events WHERE id = ${id}
  `;
  return result.count > 0;
}
