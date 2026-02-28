import type { Alert, AlertCreate } from '@dispatch/shared/types/alert';
import {
  findAlertById,
  listByTerminal as listByTerminalDb,
  listUnacknowledged as listUnacknowledgedDb,
  createAlert as createAlertDb,
  acknowledgeAlert as acknowledgeAlertDb,
  resolveAlert as resolveAlertDb,
  countUnresolved as countUnresolvedDb,
} from '../db/queries/alerts.js';
import { createAuditLog } from '../db/queries/audit-logs.js';
import { emitAlertCreated, emitAlertAcknowledged, emitAlertResolved } from '../realtime/events.js';

export class AlertServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AlertServiceError';
  }
}

export async function getAlertById(id: string): Promise<Alert> {
  const alert = await findAlertById(id);
  if (!alert) {
    throw new AlertServiceError('Alert not found', 'ALERT_NOT_FOUND', 404);
  }
  return alert;
}

export async function listAlertsByTerminal(
  terminalId: string,
  filters?: {
    resolved?: boolean;
    alertType?: string;
    severity?: string;
  },
): Promise<Alert[]> {
  return listByTerminalDb(terminalId, filters);
}

export async function listUnacknowledgedAlerts(terminalId: string): Promise<Alert[]> {
  return listUnacknowledgedDb(terminalId);
}

export async function getAlertSummary(terminalId: string): Promise<{
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}> {
  return countUnresolvedDb(terminalId);
}

export async function createDispatchAlert(
  data: AlertCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Alert> {
  const alert = await createAlertDb(data);

  emitAlertCreated(data.terminalId, alert);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'alert',
    entityId: alert.id,
    userId,
    summary: `Alert "${alert.title}" created (${alert.alertType}, ${alert.severity})`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return alert;
}

export async function acknowledgeAlert(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Alert> {
  const existing = await findAlertById(id);
  if (!existing) {
    throw new AlertServiceError('Alert not found', 'ALERT_NOT_FOUND', 404);
  }

  if (existing.isAcknowledged) {
    throw new AlertServiceError(
      'Alert has already been acknowledged',
      'ALREADY_ACKNOWLEDGED',
      400,
    );
  }

  const alert = await acknowledgeAlertDb(id, userId);
  if (!alert) {
    throw new AlertServiceError('Alert not found', 'ALERT_NOT_FOUND', 404);
  }

  emitAlertAcknowledged(alert.terminalId, alert);

  createAuditLog({
    eventType: 'alert_acknowledged',
    entityType: 'alert',
    entityId: id,
    userId,
    summary: `Alert "${alert.title}" acknowledged`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return alert;
}

export async function resolveAlert(
  id: string,
  userId: string,
  resolutionNotes?: string | null,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Alert> {
  const existing = await findAlertById(id);
  if (!existing) {
    throw new AlertServiceError('Alert not found', 'ALERT_NOT_FOUND', 404);
  }

  if (existing.isResolved) {
    throw new AlertServiceError(
      'Alert has already been resolved',
      'ALREADY_RESOLVED',
      400,
    );
  }

  const alert = await resolveAlertDb(id, userId, resolutionNotes);
  if (!alert) {
    throw new AlertServiceError('Alert not found', 'ALERT_NOT_FOUND', 404);
  }

  emitAlertResolved(alert.terminalId, alert);

  createAuditLog({
    eventType: 'alert_resolved',
    entityType: 'alert',
    entityId: id,
    userId,
    summary: `Alert "${alert.title}" resolved`,
    metadata: { resolutionNotes },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return alert;
}
