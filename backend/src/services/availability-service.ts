import type { Availability, AvailabilityCreate, AvailabilityUpdate } from '@dispatch/shared/types/availability';
import {
  findAvailabilityById,
  listByDriver as listByDriverDb,
  listUnavailableDrivers as listUnavailableDriversDb,
  createAvailability as createAvailabilityDb,
  updateAvailability as updateAvailabilityDb,
  deleteAvailability as deleteAvailabilityDb,
  isDriverAvailable as isDriverAvailableDb,
} from '../db/queries/availability.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class AvailabilityServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AvailabilityServiceError';
  }
}

export async function getAvailabilityById(id: string): Promise<Availability> {
  const record = await findAvailabilityById(id);
  if (!record) {
    throw new AvailabilityServiceError('Availability record not found', 'AVAILABILITY_NOT_FOUND', 404);
  }
  return record;
}

export async function listByDriver(driverId: string): Promise<Availability[]> {
  return listByDriverDb(driverId);
}

export async function listUnavailableDriversForDate(
  terminalId: string,
  date: string,
): Promise<Availability[]> {
  return listUnavailableDriversDb(terminalId, date);
}

export async function isDriverAvailable(driverId: string, date: string): Promise<boolean> {
  return isDriverAvailableDb(driverId, date);
}

export async function createAvailability(
  data: AvailabilityCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Availability> {
  const record = await createAvailabilityDb({ ...data, userId });

  createAuditLog({
    eventType: 'availability_change',
    entityType: 'driver',
    entityId: data.driverId,
    userId,
    summary: `Availability "${data.availabilityType}" set for ${data.startDate} to ${data.endDate}`,
    metadata: { availabilityId: record.id, type: data.availabilityType },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return record;
}

export async function updateAvailability(
  id: string,
  data: AvailabilityUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Availability> {
  const record = await updateAvailabilityDb(id, data);
  if (!record) {
    throw new AvailabilityServiceError('Availability record not found', 'AVAILABILITY_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'availability_change',
    entityType: 'driver',
    entityId: record.driverId,
    userId,
    summary: `Availability ${id} updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return record;
}

export async function removeAvailability(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const record = await findAvailabilityById(id);
  if (!record) {
    throw new AvailabilityServiceError('Availability record not found', 'AVAILABILITY_NOT_FOUND', 404);
  }

  const deleted = await deleteAvailabilityDb(id);
  if (!deleted) {
    throw new AvailabilityServiceError('Availability record not found', 'AVAILABILITY_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'availability_change',
    entityType: 'driver',
    entityId: record.driverId,
    userId,
    summary: `Availability ${id} deleted`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
