import type { Vehicle, VehicleCreate, VehicleUpdate } from '@dispatch/shared/types/vehicle';
import {
  findVehicleById,
  listVehiclesByTerminal as listVehiclesByTerminalDb,
  createVehicle as createVehicleDb,
  updateVehicle as updateVehicleDb,
  assignVehicleToTerminal as assignVehicleToTerminalDb,
  removeVehicleFromTerminal as removeVehicleFromTerminalDb,
} from '../db/queries/vehicles.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class VehicleServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'VehicleServiceError';
  }
}

export async function getVehicleById(id: string): Promise<Vehicle> {
  const vehicle = await findVehicleById(id);
  if (!vehicle) {
    throw new VehicleServiceError('Vehicle not found', 'VEHICLE_NOT_FOUND', 404);
  }
  return vehicle;
}

export async function listVehiclesByTerminal(terminalId: string): Promise<Vehicle[]> {
  return listVehiclesByTerminalDb(terminalId);
}

export async function createVehicle(
  data: VehicleCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Vehicle> {
  const vehicle = await createVehicleDb(data);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'vehicle',
    entityId: vehicle.id,
    userId,
    summary: `Vehicle "${vehicle.truckId}" created`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return vehicle;
}

export async function updateVehicle(
  id: string,
  data: VehicleUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Vehicle> {
  const vehicle = await updateVehicleDb(id, data);
  if (!vehicle) {
    throw new VehicleServiceError('Vehicle not found', 'VEHICLE_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'vehicle',
    entityId: id,
    userId,
    summary: `Vehicle "${vehicle.truckId}" updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return vehicle;
}

export async function assignVehicleToTerminal(
  terminalId: string,
  vehicleId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const vehicle = await findVehicleById(vehicleId);
  if (!vehicle) {
    throw new VehicleServiceError('Vehicle not found', 'VEHICLE_NOT_FOUND', 404);
  }

  await assignVehicleToTerminalDb(terminalId, vehicleId);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'vehicle',
    entityId: vehicleId,
    userId,
    summary: `Vehicle "${vehicle.truckId}" assigned to terminal ${terminalId}`,
    metadata: { terminalId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

export async function removeVehicleFromTerminal(
  terminalId: string,
  vehicleId: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const removed = await removeVehicleFromTerminalDb(terminalId, vehicleId);
  if (!removed) {
    throw new VehicleServiceError('Vehicle is not assigned to this terminal', 'ASSIGNMENT_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'vehicle',
    entityId: vehicleId,
    userId,
    summary: `Vehicle ${vehicleId} removed from terminal ${terminalId}`,
    metadata: { terminalId },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
