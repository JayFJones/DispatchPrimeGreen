import type { Alert, AlertCreate } from '@dispatch/shared/types/alert';
import sql from '../client.js';

const ALERT_COLUMNS = sql`
  id,
  terminal_id       AS "terminalId",
  alert_type        AS "alertType",
  severity,
  title,
  message,
  metadata,
  entity_type       AS "entityType",
  entity_id         AS "entityId",
  is_acknowledged   AS "isAcknowledged",
  acknowledged_by   AS "acknowledgedBy",
  acknowledged_at   AS "acknowledgedAt",
  is_resolved       AS "isResolved",
  resolved_by       AS "resolvedBy",
  resolved_at       AS "resolvedAt",
  resolution_notes  AS "resolutionNotes",
  created_at        AS "createdAt",
  updated_at        AS "updatedAt"
`;

export async function findAlertById(id: string): Promise<Alert | undefined> {
  const rows = await sql`
    SELECT ${ALERT_COLUMNS}
    FROM alerts
    WHERE id = ${id}
  `;
  return rows[0] as Alert | undefined;
}

export async function listByTerminal(
  terminalId: string,
  filters?: {
    resolved?: boolean;
    alertType?: string;
    severity?: string;
  },
): Promise<Alert[]> {
  const rows = await sql`
    SELECT ${ALERT_COLUMNS}
    FROM alerts
    WHERE terminal_id = ${terminalId}
      ${filters?.resolved !== undefined ? sql`AND is_resolved = ${filters.resolved}` : sql``}
      ${filters?.alertType ? sql`AND alert_type = ${filters.alertType}` : sql``}
      ${filters?.severity ? sql`AND severity = ${filters.severity}` : sql``}
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END ASC,
      created_at DESC
  `;
  return rows as unknown as Alert[];
}

export async function listUnacknowledged(terminalId: string): Promise<Alert[]> {
  const rows = await sql`
    SELECT ${ALERT_COLUMNS}
    FROM alerts
    WHERE terminal_id = ${terminalId}
      AND is_acknowledged = false
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END ASC,
      created_at DESC
  `;
  return rows as unknown as Alert[];
}

export async function createAlert(data: AlertCreate): Promise<Alert> {
  const rows = await sql`
    INSERT INTO alerts (
      terminal_id,
      alert_type,
      severity,
      title,
      message,
      metadata,
      entity_type,
      entity_id
    ) VALUES (
      ${data.terminalId},
      ${data.alertType},
      ${data.severity},
      ${data.title},
      ${data.message ?? null},
      ${data.metadata ? sql.json(data.metadata as unknown as Parameters<typeof sql.json>[0]) : null},
      ${data.entityType ?? null},
      ${data.entityId ?? null}
    )
    RETURNING ${ALERT_COLUMNS}
  `;
  return rows[0] as Alert;
}

export async function acknowledgeAlert(
  id: string,
  acknowledgedBy: string,
): Promise<Alert | undefined> {
  const rows = await sql`
    UPDATE alerts SET
      is_acknowledged = true,
      acknowledged_by = ${acknowledgedBy},
      acknowledged_at = NOW()
    WHERE id = ${id}
    RETURNING ${ALERT_COLUMNS}
  `;
  return rows[0] as Alert | undefined;
}

export async function resolveAlert(
  id: string,
  resolvedBy: string,
  resolutionNotes?: string | null,
): Promise<Alert | undefined> {
  const rows = await sql`
    UPDATE alerts SET
      is_resolved = true,
      resolved_by = ${resolvedBy},
      resolved_at = NOW(),
      resolution_notes = ${resolutionNotes ?? null}
    WHERE id = ${id}
    RETURNING ${ALERT_COLUMNS}
  `;
  return rows[0] as Alert | undefined;
}

export async function countUnresolved(terminalId: string): Promise<{
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}> {
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
      COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
      COUNT(*) FILTER (WHERE severity = 'low')::int AS low
    FROM alerts
    WHERE terminal_id = ${terminalId}
      AND is_resolved = false
  `;
  return rows[0] as { total: number; critical: number; high: number; medium: number; low: number };
}
