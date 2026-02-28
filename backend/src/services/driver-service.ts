import type { Driver, DriverCreate, DriverUpdate } from '@dispatch/shared/types/driver';
import {
  findDriverById,
  listDriversByTerminal as listDriversByTerminalDb,
  listBenchDriversByTerminal as listBenchDriversByTerminalDb,
  createDriver as createDriverDb,
  updateDriver as updateDriverDb,
  assignDriverToTerminal as assignDriverToTerminalDb,
  removeDriverFromTerminal as removeDriverFromTerminalDb,
  isDriverInTerminal,
  assignDriverToBench as assignDriverToBenchDb,
  removeDriverFromBench as removeDriverFromBenchDb,
} from '../db/queries/drivers.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class DriverServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'DriverServiceError';
  }
}

export async function getDriverById(id: string): Promise<Driver> {
  const driver = await findDriverById(id);
  if (!driver) {
    throw new DriverServiceError('Driver not found', 'DRIVER_NOT_FOUND', 404);
  }
  return driver;
}

export async function listDriversByTerminal(terminalId: string): Promise<Driver[]> {
  return listDriversByTerminalDb(terminalId);
}

export async function listBenchDriversByTerminal(terminalId: string): Promise<Driver[]> {
  return listBenchDriversByTerminalDb(terminalId);
}

export async function createDriver(
  data: DriverCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Driver> {
  const driver = await createDriverDb(data);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'driver',
    entityId: driver.id,
    userId,
    summary: `Driver "${driver.firstName} ${driver.lastName}" created`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return driver;
}

export async function updateDriver(
  id: string,
  data: DriverUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Driver> {
  const driver = await updateDriverDb(id, data);
  if (!driver) {
    throw new DriverServiceError('Driver not found', 'DRIVER_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'driver',
    entityId: id,
    userId,
    summary: `Driver "${driver.firstName} ${driver.lastName}" updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return driver;
}

export async function assignDriverToTerminal(
  terminalId: string,
  driverId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  // Verify driver exists
  const driver = await findDriverById(driverId);
  if (!driver) {
    throw new DriverServiceError('Driver not found', 'DRIVER_NOT_FOUND', 404);
  }

  await assignDriverToTerminalDb(terminalId, driverId);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'driver',
    entityId: driverId,
    userId,
    summary: `Driver "${driver.firstName} ${driver.lastName}" assigned to terminal ${terminalId}`,
    metadata: { terminalId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

export async function removeDriverFromTerminal(
  terminalId: string,
  driverId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const removed = await removeDriverFromTerminalDb(terminalId, driverId);
  if (!removed) {
    throw new DriverServiceError('Driver is not assigned to this terminal', 'ASSIGNMENT_NOT_FOUND', 404);
  }

  // Also remove from bench if present
  await removeDriverFromBenchDb(terminalId, driverId);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'driver',
    entityId: driverId,
    userId,
    summary: `Driver ${driverId} removed from terminal ${terminalId}`,
    metadata: { terminalId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

export async function assignDriverToBench(
  terminalId: string,
  driverId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  // Business rule: driver must be in terminal_drivers first
  const inTerminal = await isDriverInTerminal(terminalId, driverId);
  if (!inTerminal) {
    throw new DriverServiceError(
      'Driver must be assigned to the terminal before being added to the bench',
      'NOT_IN_TERMINAL',
      400,
    );
  }

  await assignDriverToBenchDb(terminalId, driverId);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'driver',
    entityId: driverId,
    userId,
    summary: `Driver ${driverId} added to bench at terminal ${terminalId}`,
    metadata: { terminalId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

export async function removeDriverFromBench(
  terminalId: string,
  driverId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const removed = await removeDriverFromBenchDb(terminalId, driverId);
  if (!removed) {
    throw new DriverServiceError('Driver is not on the bench at this terminal', 'BENCH_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'driver',
    entityId: driverId,
    userId,
    summary: `Driver ${driverId} removed from bench at terminal ${terminalId}`,
    metadata: { terminalId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
