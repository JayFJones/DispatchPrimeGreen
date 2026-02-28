import type { Route, RouteCreate, RouteUpdate } from '@dispatch/shared/types/route';
import type { RouteStop, RouteStopCreate, RouteStopUpdate } from '@dispatch/shared/types/route-stop';
import {
  findRouteById,
  listRoutesByTerminal as listRoutesByTerminalDb,
  listRoutesForDay as listRoutesForDayDb,
  createRoute as createRouteDb,
  updateRoute as updateRouteDb,
  deleteRoute as deleteRouteDb,
} from '../db/queries/routes.js';
import {
  listRouteStopsByRoute,
  createRouteStop as createRouteStopDb,
  createRouteStops as createRouteStopsDb,
  updateRouteStop as updateRouteStopDb,
  deleteRouteStop as deleteRouteStopDb,
  countRouteStopsByRoute,
} from '../db/queries/route-stops.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class RouteServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'RouteServiceError';
  }
}

export async function getRouteById(id: string): Promise<Route> {
  const route = await findRouteById(id);
  if (!route) {
    throw new RouteServiceError('Route not found', 'ROUTE_NOT_FOUND', 404);
  }
  return route;
}

export async function listRoutesByTerminal(terminalId: string): Promise<Route[]> {
  return listRoutesByTerminalDb(terminalId);
}

export async function listRoutesForDay(
  terminalId: string,
  dayColumn: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
): Promise<Route[]> {
  return listRoutesForDayDb(terminalId, dayColumn);
}

export async function createRoute(
  data: RouteCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Route> {
  const route = await createRouteDb(data);

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: route.id,
    userId,
    summary: `Route "${route.trkid}" created`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return route;
}

export async function updateRoute(
  id: string,
  data: RouteUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Route> {
  const route = await updateRouteDb(id, data);
  if (!route) {
    throw new RouteServiceError('Route not found', 'ROUTE_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: id,
    userId,
    summary: `Route "${route.trkid}" updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return route;
}

export async function removeRoute(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const route = await findRouteById(id);
  if (!route) {
    throw new RouteServiceError('Route not found', 'ROUTE_NOT_FOUND', 404);
  }

  const deleted = await deleteRouteDb(id);
  if (!deleted) {
    throw new RouteServiceError('Route not found', 'ROUTE_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: id,
    userId,
    summary: `Route "${route.trkid}" deleted`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

// Route stop operations

export async function getRouteStops(routeId: string): Promise<RouteStop[]> {
  // Verify route exists
  await getRouteById(routeId);
  return listRouteStopsByRoute(routeId);
}

export async function createRouteStop(
  data: RouteStopCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<RouteStop> {
  // Verify route exists
  await getRouteById(data.routeId);

  const stop = await createRouteStopDb(data);

  // Update total_stops on route
  const count = await countRouteStopsByRoute(data.routeId);
  await updateRouteDb(data.routeId, { totalStops: count });

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: data.routeId,
    userId,
    summary: `Route stop added at sequence ${stop.sequence}`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return stop;
}

export async function replaceRouteStops(
  routeId: string,
  stops: Omit<RouteStopCreate, 'routeId'>[],
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<RouteStop[]> {
  // Verify route exists
  await getRouteById(routeId);

  // Delete existing stops (cascade from route_stops table)
  const existing = await listRouteStopsByRoute(routeId);
  for (const stop of existing) {
    await deleteRouteStopDb(stop.id);
  }

  // Bulk create new stops
  const stopsWithRouteId = stops.map((s) => ({ ...s, routeId }));
  const created = await createRouteStopsDb(stopsWithRouteId);

  // Update total_stops
  await updateRouteDb(routeId, { totalStops: created.length });

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: routeId,
    userId,
    summary: `Route stops replaced (${created.length} stops)`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return created;
}

export async function updateRouteStop(
  id: string,
  data: RouteStopUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<RouteStop> {
  const stop = await updateRouteStopDb(id, data);
  if (!stop) {
    throw new RouteServiceError('Route stop not found', 'ROUTE_STOP_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: stop.routeId,
    userId,
    summary: `Route stop ${id} updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return stop;
}

export async function removeRouteStop(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const { findRouteStopById } = await import('../db/queries/route-stops.js');
  const stop = await findRouteStopById(id);
  if (!stop) {
    throw new RouteServiceError('Route stop not found', 'ROUTE_STOP_NOT_FOUND', 404);
  }

  const deleted = await deleteRouteStopDb(id);
  if (!deleted) {
    throw new RouteServiceError('Route stop not found', 'ROUTE_STOP_NOT_FOUND', 404);
  }

  // Update total_stops
  const count = await countRouteStopsByRoute(stop.routeId);
  await updateRouteDb(stop.routeId, { totalStops: count });

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: stop.routeId,
    userId,
    summary: `Route stop removed from sequence ${stop.sequence}`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
