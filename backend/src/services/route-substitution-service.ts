import type {
  RouteSubstitution,
  RouteSubstitutionCreate,
  RouteSubstitutionUpdate,
} from '@dispatch/shared/types/route-substitution';
import {
  findRouteSubstitutionById,
  listByRoute as listByRouteDb,
  findActiveSubstitution as findActiveSubstitutionDb,
  createRouteSubstitution as createRouteSubstitutionDb,
  updateRouteSubstitution as updateRouteSubstitutionDb,
  deleteRouteSubstitution as deleteRouteSubstitutionDb,
} from '../db/queries/route-substitutions.js';
import { findRouteById } from '../db/queries/routes.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class RouteSubstitutionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'RouteSubstitutionServiceError';
  }
}

export async function getSubstitutionById(id: string): Promise<RouteSubstitution> {
  const sub = await findRouteSubstitutionById(id);
  if (!sub) {
    throw new RouteSubstitutionServiceError(
      'Route substitution not found',
      'SUBSTITUTION_NOT_FOUND',
      404,
    );
  }
  return sub;
}

export async function listByRoute(routeId: string): Promise<RouteSubstitution[]> {
  return listByRouteDb(routeId);
}

export async function getActiveSubstitution(
  routeId: string,
  date: string,
): Promise<RouteSubstitution | undefined> {
  return findActiveSubstitutionDb(routeId, date);
}

export async function createSubstitution(
  data: RouteSubstitutionCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<RouteSubstitution> {
  // Verify route exists
  const route = await findRouteById(data.routeId);
  if (!route) {
    throw new RouteSubstitutionServiceError('Route not found', 'ROUTE_NOT_FOUND', 404);
  }

  const sub = await createRouteSubstitutionDb({ ...data, createdBy: userId });

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: data.routeId,
    userId,
    summary: `Route substitution created for ${data.startDate} to ${data.endDate}`,
    metadata: { substitutionId: sub.id },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return sub;
}

export async function updateSubstitution(
  id: string,
  data: RouteSubstitutionUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<RouteSubstitution> {
  const sub = await updateRouteSubstitutionDb(id, data);
  if (!sub) {
    throw new RouteSubstitutionServiceError(
      'Route substitution not found',
      'SUBSTITUTION_NOT_FOUND',
      404,
    );
  }

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: sub.routeId,
    userId,
    summary: `Route substitution ${id} updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return sub;
}

export async function removeSubstitution(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const sub = await findRouteSubstitutionById(id);
  if (!sub) {
    throw new RouteSubstitutionServiceError(
      'Route substitution not found',
      'SUBSTITUTION_NOT_FOUND',
      404,
    );
  }

  const deleted = await deleteRouteSubstitutionDb(id);
  if (!deleted) {
    throw new RouteSubstitutionServiceError(
      'Route substitution not found',
      'SUBSTITUTION_NOT_FOUND',
      404,
    );
  }

  createAuditLog({
    eventType: 'route_change',
    entityType: 'route',
    entityId: sub.routeId,
    userId,
    summary: `Route substitution ${id} deleted`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
