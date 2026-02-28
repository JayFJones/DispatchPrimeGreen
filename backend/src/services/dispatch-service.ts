import type { DispatchEvent, DispatchEventCreate, DispatchEventUpdate } from '@dispatch/shared/types/dispatch-event';
import type { DispatchEventStop, DispatchEventStopUpdate } from '@dispatch/shared/types/dispatch-event-stop';
import type { DispatchStatus } from '@dispatch/shared/constants/status';
import {
  findDispatchEventById,
  findByRouteAndDate,
  listByTerminal as listByTerminalDb,
  createDispatchEvent as createDispatchEventDb,
  updateDispatchEvent as updateDispatchEventDb,
  deleteDispatchEvent as deleteDispatchEventDb,
} from '../db/queries/dispatch-events.js';
import {
  listByDispatchEvent,
  createDispatchEventStops,
  updateDispatchEventStop as updateDispatchEventStopDb,
  countCompletedStops,
  findDispatchEventStopById,
} from '../db/queries/dispatch-event-stops.js';
import { listRouteStopsByRoute } from '../db/queries/route-stops.js';
import { findRouteById } from '../db/queries/routes.js';
import { findActiveSubstitution } from '../db/queries/route-substitutions.js';
import { isDriverAvailable } from '../db/queries/availability.js';
import { listRoutesForDay } from '../db/queries/routes.js';
import { createAuditLog } from '../db/queries/audit-logs.js';
import {
  emitDispatchCreated,
  emitDispatchUpdated,
  emitDispatchStatusChanged,
  emitStopUpdated,
} from '../realtime/events.js';

export class DispatchServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'DispatchServiceError';
  }
}

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  planned: ['assigned', 'cancelled'],
  assigned: ['dispatched', 'planned', 'cancelled'],
  dispatched: ['in_transit', 'assigned', 'cancelled'],
  in_transit: ['completed', 'delayed', 'cancelled'],
  delayed: ['in_transit', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function getDispatchEventById(id: string): Promise<DispatchEvent> {
  const event = await findDispatchEventById(id);
  if (!event) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }
  return event;
}

export async function getDispatchEventWithStops(id: string): Promise<{
  event: DispatchEvent;
  stops: DispatchEventStop[];
}> {
  const event = await getDispatchEventById(id);
  const stops = await listByDispatchEvent(id);
  return { event, stops };
}

export async function listDispatchBoard(
  terminalId: string,
  filters?: {
    date?: string;
    status?: string;
    driverId?: string;
  },
): Promise<DispatchEvent[]> {
  return listByTerminalDb(terminalId, filters);
}

export async function createDispatchEvent(
  data: DispatchEventCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ event: DispatchEvent; stops: DispatchEventStop[] }> {
  // Verify route exists
  const route = await findRouteById(data.routeId);
  if (!route) {
    throw new DispatchServiceError('Route not found', 'ROUTE_NOT_FOUND', 404);
  }

  // Check for duplicate (same route + date)
  const existing = await findByRouteAndDate(data.routeId, data.executionDate);
  if (existing) {
    throw new DispatchServiceError(
      'A dispatch event already exists for this route and date',
      'DUPLICATE_DISPATCH',
      409,
    );
  }

  // Check active substitution for driver/truck overrides
  const substitution = await findActiveSubstitution(data.routeId, data.executionDate);

  const eventData: DispatchEventCreate = { ...data };

  // Apply substitution overrides if no explicit values provided
  if (substitution) {
    if (!eventData.assignedDriverId && substitution.driverId) {
      eventData.assignedDriverId = substitution.driverId;
    }
    if (!eventData.assignedTruckId && substitution.truckNumber) {
      eventData.assignedTruckId = substitution.truckNumber;
    }
    if (!eventData.assignedSubUnitId && substitution.subUnitNumber) {
      eventData.assignedSubUnitId = substitution.subUnitNumber;
    }
  }

  // If still no driver, use route default
  if (!eventData.assignedDriverId && route.defaultDriverId) {
    eventData.assignedDriverId = route.defaultDriverId;
  }

  // If still no truck, use route default
  if (!eventData.assignedTruckId && route.truckNumber) {
    eventData.assignedTruckId = route.truckNumber;
  }

  // Auto-set status to 'assigned' if driver is provided
  if (eventData.assignedDriverId && (!eventData.status || eventData.status === 'planned')) {
    eventData.status = 'assigned';
  }

  // Set planned departure from route if not provided
  if (!eventData.plannedDepartureTime && route.departureTime) {
    eventData.plannedDepartureTime = route.departureTime;
  }

  const event = await createDispatchEventDb(eventData);

  // Auto-populate stops from route_stops
  const routeStops = await listRouteStopsByRoute(data.routeId);
  const stops = await createDispatchEventStops(
    routeStops.map((rs) => ({
      dispatchEventId: event.id,
      routeStopId: rs.id,
      sequence: rs.sequence,
      plannedEta: rs.eta,
      plannedEtd: rs.etd,
    })),
  );

  emitDispatchCreated(event.terminalId, event);

  createAuditLog({
    eventType: 'dispatch_change',
    entityType: 'dispatch_event',
    entityId: event.id,
    userId,
    summary: `Dispatch event created for route ${route.trkid} on ${data.executionDate}`,
    metadata: { routeId: data.routeId, stopsCreated: stops.length },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return { event, stops };
}

export async function updateDispatchEvent(
  id: string,
  data: DispatchEventUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<DispatchEvent> {
  const event = await updateDispatchEventDb(id, data);
  if (!event) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  emitDispatchUpdated(event.terminalId, event);

  createAuditLog({
    eventType: 'dispatch_change',
    entityType: 'dispatch_event',
    entityId: id,
    userId,
    summary: `Dispatch event ${id} updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return event;
}

export async function changeDispatchStatus(
  id: string,
  newStatus: DispatchStatus,
  userId: string,
  statusData?: { cancellationReason?: string; cancellationNotes?: string },
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<DispatchEvent> {
  const existing = await findDispatchEventById(id);
  if (!existing) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  const allowed = VALID_STATUS_TRANSITIONS[existing.status];
  if (!allowed.includes(newStatus)) {
    throw new DispatchServiceError(
      `Cannot transition from "${existing.status}" to "${newStatus}". Valid transitions: ${allowed.join(', ') || 'none (terminal state)'}`,
      'INVALID_STATUS_TRANSITION',
      400,
    );
  }

  const updateData: DispatchEventUpdate = { status: newStatus };

  if (newStatus === 'cancelled') {
    updateData.cancellationReason = statusData?.cancellationReason ?? null;
    updateData.cancellationNotes = statusData?.cancellationNotes ?? null;
  }

  if (newStatus === 'completed') {
    updateData.actualCompletionTime = new Date();
  }

  const event = await updateDispatchEventDb(id, updateData);
  if (!event) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  emitDispatchStatusChanged(event.terminalId, event);

  createAuditLog({
    eventType: 'dispatch_change',
    entityType: 'dispatch_event',
    entityId: id,
    userId,
    summary: `Dispatch status changed: ${existing.status} → ${newStatus}`,
    metadata: { previousStatus: existing.status, newStatus },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return event;
}

export async function assignDriver(
  id: string,
  driverId: string | null,
  truckId: string | null | undefined,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<DispatchEvent> {
  const existing = await findDispatchEventById(id);
  if (!existing) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  // Check driver availability if assigning
  if (driverId) {
    const available = await isDriverAvailable(driverId, existing.executionDate);
    if (!available) {
      throw new DispatchServiceError(
        'Driver is not available on this date',
        'DRIVER_UNAVAILABLE',
        400,
      );
    }
  }

  const updateData: DispatchEventUpdate = {
    assignedDriverId: driverId,
  };
  if (truckId !== undefined) {
    updateData.assignedTruckId = truckId;
  }

  // Auto-transition to assigned if currently planned and driver is set
  if (driverId && existing.status === 'planned') {
    updateData.status = 'assigned';
  }

  // Revert to planned if unassigning driver from assigned state
  if (!driverId && existing.status === 'assigned') {
    updateData.status = 'planned';
  }

  const event = await updateDispatchEventDb(id, updateData);
  if (!event) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  emitDispatchUpdated(event.terminalId, event);

  createAuditLog({
    eventType: 'dispatch_change',
    entityType: 'dispatch_event',
    entityId: id,
    userId,
    summary: driverId
      ? `Driver ${driverId} assigned to dispatch ${id}`
      : `Driver unassigned from dispatch ${id}`,
    metadata: { driverId, truckId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return event;
}

/** Calculate on-time status based on planned ETA and actual arrival */
function calculateOnTimeStatus(
  plannedEta: string | null,
  actualArrival: Date,
): 'early' | 'on_time' | 'delayed' | 'late' {
  if (!plannedEta) return 'on_time';

  // Parse planned ETA as time-of-day on the same date as actual arrival
  const arrivalDate = new Date(actualArrival);
  const [hours, minutes] = plannedEta.split(':').map(Number);
  const planned = new Date(arrivalDate);
  planned.setHours(hours, minutes, 0, 0);

  const diffMinutes = (arrivalDate.getTime() - planned.getTime()) / (1000 * 60);

  if (diffMinutes < 0) return 'early';
  if (diffMinutes <= 15) return 'on_time';
  if (diffMinutes <= 30) return 'delayed';
  return 'late';
}

export async function updateStop(
  dispatchId: string,
  stopId: string,
  data: DispatchEventStopUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<DispatchEventStop> {
  const dispatchEvent = await findDispatchEventById(dispatchId);
  if (!dispatchEvent) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  const existingStop = await findDispatchEventStopById(stopId);
  if (!existingStop || existingStop.dispatchEventId !== dispatchId) {
    throw new DispatchServiceError('Stop not found for this dispatch event', 'STOP_NOT_FOUND', 404);
  }

  // Calculate on-time status when arrival is recorded
  if (data.actualArrivalTime && data.status === 'arrived') {
    const arrival = data.actualArrivalTime instanceof Date
      ? data.actualArrivalTime
      : new Date(data.actualArrivalTime);
    data.onTimeStatus = calculateOnTimeStatus(existingStop.plannedEta, arrival);
  }

  const stop = await updateDispatchEventStopDb(stopId, data);
  if (!stop) {
    throw new DispatchServiceError('Stop not found', 'STOP_NOT_FOUND', 404);
  }

  emitStopUpdated(dispatchEvent.terminalId, stop);

  // Check for dispatch-level cascades
  if (data.status === 'arrived' && dispatchEvent.status === 'dispatched') {
    // First stop arriving → dispatch moves to in_transit
    await updateDispatchEventDb(dispatchId, {
      status: 'in_transit',
      actualDepartureTime: new Date(),
    });
    const updated = await findDispatchEventById(dispatchId);
    if (updated) {
      emitDispatchStatusChanged(updated.terminalId, updated);
    }
  }

  // Check if all stops are terminal (completed/skipped/exception)
  if (data.status && ['completed', 'skipped', 'exception'].includes(data.status)) {
    const allStops = await listByDispatchEvent(dispatchId);
    const allTerminal = allStops.every(
      (s) => s.status === 'completed' || s.status === 'skipped' || s.status === 'exception',
    );

    if (allTerminal) {
      // Recalculate performance metrics
      const metrics = await countCompletedStops(dispatchId);
      const onTimePerformance = metrics.total > 0
        ? Math.round((metrics.onTime / metrics.total) * 100)
        : null;

      await updateDispatchEventDb(dispatchId, {
        status: 'completed',
        actualCompletionTime: new Date(),
        onTimePerformance,
      });

      const completedEvent = await findDispatchEventById(dispatchId);
      if (completedEvent) {
        emitDispatchStatusChanged(completedEvent.terminalId, completedEvent);
      }
    }
  }

  createAuditLog({
    eventType: 'dispatch_change',
    entityType: 'dispatch_event',
    entityId: dispatchId,
    userId,
    summary: `Stop ${stopId} updated (status: ${stop.status})`,
    metadata: { stopId, changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return stop;
}

export async function removeDispatchEvent(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const event = await findDispatchEventById(id);
  if (!event) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  const deleted = await deleteDispatchEventDb(id);
  if (!deleted) {
    throw new DispatchServiceError('Dispatch event not found', 'DISPATCH_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'dispatch_change',
    entityType: 'dispatch_event',
    entityId: id,
    userId,
    summary: `Dispatch event ${id} deleted`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

/** Generate dispatch events for all routes scheduled for today */
export async function generateDailyDispatchEvents(
  terminalId: string,
  date: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<{ created: DispatchEvent[]; skipped: string[] }> {
  const dayOfWeek = new Date(date).getDay();
  const dayColumns: Array<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = [
    'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
  ];
  const dayColumn = dayColumns[dayOfWeek];

  const routes = await listRoutesForDay(terminalId, dayColumn);

  const created: DispatchEvent[] = [];
  const skipped: string[] = [];

  for (const route of routes) {
    // Check if event already exists
    const existing = await findByRouteAndDate(route.id, date);
    if (existing) {
      skipped.push(route.trkid);
      continue;
    }

    try {
      const result = await createDispatchEvent(
        {
          routeId: route.id,
          terminalId,
          executionDate: date,
        },
        userId,
        meta,
      );
      created.push(result.event);
    } catch {
      skipped.push(route.trkid);
    }
  }

  return { created, skipped };
}
