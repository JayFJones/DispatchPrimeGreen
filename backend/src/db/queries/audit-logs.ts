import type { AuditLogCreate, AuditLog } from '@dispatch/shared/types/audit-log';
import sql from '../client.js';

export interface AuditLogFilters {
  startDate: string;
  endDate: string;
  eventType?: string;
  entityType?: string;
  userId?: string;
  limit: number;
  offset: number;
}

export async function createAuditLog(data: AuditLogCreate): Promise<AuditLog> {
  const rows = await sql`
    INSERT INTO audit_logs (
      event_type,
      entity_type,
      entity_id,
      user_id,
      user_email,
      summary,
      metadata,
      ip_address,
      user_agent
    ) VALUES (
      ${data.eventType},
      ${data.entityType},
      ${data.entityId ?? null},
      ${data.userId ?? null},
      ${data.userEmail ?? null},
      ${data.summary},
      ${data.metadata ? sql.json(data.metadata as unknown as Parameters<typeof sql.json>[0]) : null},
      ${data.ipAddress ?? null},
      ${data.userAgent ?? null}
    )
    RETURNING
      id,
      event_type  AS "eventType",
      entity_type AS "entityType",
      entity_id   AS "entityId",
      user_id     AS "userId",
      user_email  AS "userEmail",
      summary,
      metadata,
      ip_address  AS "ipAddress",
      user_agent  AS "userAgent",
      created_at  AS "createdAt"
  `;
  return rows[0] as AuditLog;
}

export async function listAuditLogs(filters: AuditLogFilters): Promise<AuditLog[]> {
  const rows = await sql`
    SELECT
      id,
      event_type  AS "eventType",
      entity_type AS "entityType",
      entity_id   AS "entityId",
      user_id     AS "userId",
      user_email  AS "userEmail",
      summary,
      metadata,
      ip_address  AS "ipAddress",
      user_agent  AS "userAgent",
      created_at  AS "createdAt"
    FROM audit_logs
    WHERE created_at >= ${filters.startDate}::date
      AND created_at < (${filters.endDate}::date + interval '1 day')
      ${filters.eventType ? sql`AND event_type = ${filters.eventType}` : sql``}
      ${filters.entityType ? sql`AND entity_type = ${filters.entityType}` : sql``}
      ${filters.userId ? sql`AND user_id = ${filters.userId}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `;
  return rows as unknown as AuditLog[];
}

export async function countAuditLogs(filters: Omit<AuditLogFilters, 'limit' | 'offset'>): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM audit_logs
    WHERE created_at >= ${filters.startDate}::date
      AND created_at < (${filters.endDate}::date + interval '1 day')
      ${filters.eventType ? sql`AND event_type = ${filters.eventType}` : sql``}
      ${filters.entityType ? sql`AND entity_type = ${filters.entityType}` : sql``}
      ${filters.userId ? sql`AND user_id = ${filters.userId}` : sql``}
  `;
  return (rows[0] as { count: number }).count;
}
