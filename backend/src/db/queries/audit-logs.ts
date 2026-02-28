import type { AuditLogCreate, AuditLog } from '@dispatch/shared/types/audit-log';
import sql from '../client.js';

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
