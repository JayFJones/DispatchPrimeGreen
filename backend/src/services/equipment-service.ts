import type { Equipment, EquipmentCreate, EquipmentUpdate } from '@dispatch/shared/types/equipment';
import {
  findEquipmentById,
  listEquipment as listEquipmentDb,
  createEquipment as createEquipmentDb,
  updateEquipment as updateEquipmentDb,
  deleteEquipment as deleteEquipmentDb,
} from '../db/queries/equipment.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class EquipmentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'EquipmentServiceError';
  }
}

export async function getEquipmentById(id: string): Promise<Equipment> {
  const equipment = await findEquipmentById(id);
  if (!equipment) {
    throw new EquipmentServiceError('Equipment not found', 'EQUIPMENT_NOT_FOUND', 404);
  }
  return equipment;
}

export async function listEquipment(): Promise<Equipment[]> {
  return listEquipmentDb();
}

export async function createEquipment(
  data: EquipmentCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Equipment> {
  const equipment = await createEquipmentDb(data);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'equipment',
    entityId: equipment.id,
    userId,
    summary: `Equipment "${equipment.equipmentNumber}" (${equipment.equipmentType}) created`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return equipment;
}

export async function updateEquipment(
  id: string,
  data: EquipmentUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Equipment> {
  const equipment = await updateEquipmentDb(id, data);
  if (!equipment) {
    throw new EquipmentServiceError('Equipment not found', 'EQUIPMENT_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'equipment',
    entityId: id,
    userId,
    summary: `Equipment "${equipment.equipmentNumber}" updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return equipment;
}

export async function removeEquipment(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const equipment = await findEquipmentById(id);
  if (!equipment) {
    throw new EquipmentServiceError('Equipment not found', 'EQUIPMENT_NOT_FOUND', 404);
  }

  const deleted = await deleteEquipmentDb(id);
  if (!deleted) {
    throw new EquipmentServiceError('Equipment not found', 'EQUIPMENT_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'equipment',
    entityId: id,
    userId,
    summary: `Equipment "${equipment.equipmentNumber}" (${equipment.equipmentType}) deleted`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
