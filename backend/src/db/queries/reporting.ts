import sql from '../client.js';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  limit: number;
  offset: number;
}

export interface RouteHistoryRow {
  id: string;
  executionDate: string;
  status: string;
  actualDepartureTime: string | null;
  actualCompletionTime: string | null;
  totalMiles: number | null;
  onTimePerformance: number | null;
  trkid: string;
  truckNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  completedStops: number;
  totalStops: number;
}

export interface RouteHistorySummary {
  totalRecords: number;
  completedCount: number;
  cancelledCount: number;
  avgOnTimePerformance: number | null;
  totalMilesSum: number | null;
}

export interface HosReportRow {
  driverId: string;
  firstName: string;
  lastName: string;
  violationCount: number;
  criticalCount: number;
  highCount: number;
  resolvedCount: number;
  firstViolation: string;
  lastViolation: string;
}

export interface BillingSummaryRow {
  routeId: string;
  trkid: string;
  truckNumber: string | null;
  totalDispatches: number;
  completedDispatches: number;
  totalMiles: number | null;
  totalServiceTime: number | null;
  totalFuelUsed: number | null;
  totalStopsCompleted: number;
}

export async function getRouteHistory(
  terminalId: string,
  filters: ReportFilters,
): Promise<RouteHistoryRow[]> {
  const rows = await sql`
    SELECT
      de.id,
      de.execution_date            AS "executionDate",
      de.status,
      de.actual_departure_time     AS "actualDepartureTime",
      de.actual_completion_time    AS "actualCompletionTime",
      de.total_miles::float8       AS "totalMiles",
      de.on_time_performance::float8 AS "onTimePerformance",
      r.trkid,
      r.truck_number               AS "truckNumber",
      d.first_name                 AS "firstName",
      d.last_name                  AS "lastName",
      (SELECT COUNT(*) FROM dispatch_event_stops WHERE dispatch_event_id = de.id AND status = 'completed')::int AS "completedStops",
      (SELECT COUNT(*) FROM dispatch_event_stops WHERE dispatch_event_id = de.id)::int AS "totalStops"
    FROM dispatch_events de
    JOIN routes r ON de.route_id = r.id
    LEFT JOIN drivers d ON de.assigned_driver_id = d.id
    WHERE de.terminal_id = ${terminalId}
      AND de.execution_date BETWEEN ${filters.startDate} AND ${filters.endDate}
    ORDER BY de.execution_date DESC, de.planned_departure_time ASC
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `;
  return rows as unknown as RouteHistoryRow[];
}

export async function getRouteHistorySummary(
  terminalId: string,
  filters: Omit<ReportFilters, 'limit' | 'offset'>,
): Promise<RouteHistorySummary> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS "totalRecords",
      COUNT(*) FILTER (WHERE status = 'completed')::int AS "completedCount",
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS "cancelledCount",
      AVG(on_time_performance)::float8 AS "avgOnTimePerformance",
      SUM(total_miles)::float8 AS "totalMilesSum"
    FROM dispatch_events
    WHERE terminal_id = ${terminalId}
      AND execution_date BETWEEN ${filters.startDate} AND ${filters.endDate}
  `;
  return rows[0] as unknown as RouteHistorySummary;
}

export async function getHosReport(
  terminalId: string,
  filters: ReportFilters,
): Promise<HosReportRow[]> {
  const rows = await sql`
    SELECT
      a.entity_id                  AS "driverId",
      d.first_name                 AS "firstName",
      d.last_name                  AS "lastName",
      COUNT(*)::int                AS "violationCount",
      COUNT(*) FILTER (WHERE a.severity = 'critical')::int AS "criticalCount",
      COUNT(*) FILTER (WHERE a.severity = 'high')::int AS "highCount",
      COUNT(*) FILTER (WHERE a.is_resolved = true)::int AS "resolvedCount",
      MIN(a.created_at)            AS "firstViolation",
      MAX(a.created_at)            AS "lastViolation"
    FROM alerts a
    JOIN drivers d ON a.entity_id = d.id
    WHERE a.terminal_id = ${terminalId}
      AND a.alert_type = 'hos_violation'
      AND a.entity_type = 'driver'
      AND a.created_at >= ${filters.startDate}::date
      AND a.created_at < (${filters.endDate}::date + interval '1 day')
    GROUP BY a.entity_id, d.first_name, d.last_name
    ORDER BY "violationCount" DESC
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `;
  return rows as unknown as HosReportRow[];
}

export async function getBillingSummary(
  terminalId: string,
  filters: ReportFilters,
): Promise<BillingSummaryRow[]> {
  const rows = await sql`
    SELECT
      r.id                         AS "routeId",
      r.trkid,
      r.truck_number               AS "truckNumber",
      COUNT(*)::int                AS "totalDispatches",
      COUNT(*) FILTER (WHERE de.status = 'completed')::int AS "completedDispatches",
      SUM(de.total_miles)::float8  AS "totalMiles",
      SUM(de.total_service_time)::float8 AS "totalServiceTime",
      SUM(de.fuel_used)::float8    AS "totalFuelUsed",
      (SELECT COUNT(*) FROM dispatch_event_stops des
       JOIN dispatch_events de2 ON des.dispatch_event_id = de2.id
       WHERE de2.route_id = r.id
         AND de2.terminal_id = ${terminalId}
         AND de2.execution_date BETWEEN ${filters.startDate} AND ${filters.endDate}
         AND des.status = 'completed')::int AS "totalStopsCompleted"
    FROM routes r
    JOIN dispatch_events de ON de.route_id = r.id
    WHERE de.terminal_id = ${terminalId}
      AND de.execution_date BETWEEN ${filters.startDate} AND ${filters.endDate}
    GROUP BY r.id, r.trkid, r.truck_number
    ORDER BY r.trkid
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `;
  return rows as unknown as BillingSummaryRow[];
}
