import type { DispatchEvent } from '@dispatch/shared/types/dispatch-event';
import type { DispatchEventStop } from '@dispatch/shared/types/dispatch-event-stop';
import type { Alert } from '@dispatch/shared/types/alert';
import { getSocketManager } from './socket-server.js';

function emit(terminalId: string, event: string, payload: unknown): void {
  const manager = getSocketManager();
  if (!manager) return;
  manager.emitToTerminal(terminalId, event, payload);
}

export function emitDispatchCreated(terminalId: string, dispatchEvent: DispatchEvent): void {
  emit(terminalId, 'dispatch:created', dispatchEvent);
}

export function emitDispatchUpdated(terminalId: string, dispatchEvent: DispatchEvent): void {
  emit(terminalId, 'dispatch:updated', dispatchEvent);
}

export function emitDispatchStatusChanged(terminalId: string, dispatchEvent: DispatchEvent): void {
  emit(terminalId, 'dispatch:statusChanged', dispatchEvent);
}

export function emitStopUpdated(terminalId: string, stop: DispatchEventStop): void {
  emit(terminalId, 'stop:updated', stop);
}

export function emitAlertCreated(terminalId: string, alert: Alert): void {
  emit(terminalId, 'alert:created', alert);
}

export function emitAlertAcknowledged(terminalId: string, alert: Alert): void {
  emit(terminalId, 'alert:acknowledged', alert);
}

export function emitAlertResolved(terminalId: string, alert: Alert): void {
  emit(terminalId, 'alert:resolved', alert);
}
