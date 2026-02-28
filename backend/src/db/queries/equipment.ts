import type { Equipment, EquipmentCreate, EquipmentUpdate } from '@dispatch/shared/types/equipment';
import sql from '../client.js';

const EQUIPMENT_COLUMNS = sql`
  id,
  equipment_number       AS "equipmentNumber",
  equipment_type         AS "equipmentType",
  status,
  operational_status     AS "operationalStatus",
  truck_type             AS "truckType",
  make,
  model,
  year,
  vin,
  license_plate          AS "licensePlate",
  registration_state     AS "registrationState",
  registration_expiry    AS "registrationExpiry",
  insurance_policy       AS "insurancePolicy",
  insurance_expiry       AS "insuranceExpiry",
  last_maintenance_date  AS "lastMaintenanceDate",
  next_maintenance_date  AS "nextMaintenanceDate",
  mileage::float8        AS mileage,
  fuel_type              AS "fuelType",
  capacity,
  notes,
  created_at             AS "createdAt",
  updated_at             AS "updatedAt"
`;

export async function findEquipmentById(id: string): Promise<Equipment | undefined> {
  const rows = await sql`
    SELECT ${EQUIPMENT_COLUMNS}
    FROM equipment
    WHERE id = ${id}
  `;
  return rows[0] as Equipment | undefined;
}

export async function listEquipment(): Promise<Equipment[]> {
  const rows = await sql`
    SELECT ${EQUIPMENT_COLUMNS}
    FROM equipment
    ORDER BY equipment_number ASC
  `;
  return rows as unknown as Equipment[];
}

export async function createEquipment(data: EquipmentCreate): Promise<Equipment> {
  const rows = await sql`
    INSERT INTO equipment (
      equipment_number,
      equipment_type,
      status,
      operational_status,
      truck_type,
      make,
      model,
      year,
      vin,
      license_plate,
      registration_state,
      registration_expiry,
      insurance_policy,
      insurance_expiry,
      last_maintenance_date,
      next_maintenance_date,
      mileage,
      fuel_type,
      capacity,
      notes
    ) VALUES (
      ${data.equipmentNumber},
      ${data.equipmentType},
      ${data.status},
      ${data.operationalStatus ?? null},
      ${data.truckType ?? null},
      ${data.make ?? null},
      ${data.model ?? null},
      ${data.year ?? null},
      ${data.vin ?? null},
      ${data.licensePlate ?? null},
      ${data.registrationState ?? null},
      ${data.registrationExpiry ?? null},
      ${data.insurancePolicy ?? null},
      ${data.insuranceExpiry ?? null},
      ${data.lastMaintenanceDate ?? null},
      ${data.nextMaintenanceDate ?? null},
      ${data.mileage ?? null},
      ${data.fuelType ?? null},
      ${data.capacity ?? null},
      ${data.notes ?? null}
    )
    RETURNING ${EQUIPMENT_COLUMNS}
  `;
  return rows[0] as Equipment;
}

export async function updateEquipment(
  id: string,
  data: EquipmentUpdate,
): Promise<Equipment | undefined> {
  const values: Record<string, unknown> = {};

  if (data.equipmentNumber !== undefined) values['equipment_number'] = data.equipmentNumber;
  if (data.equipmentType !== undefined) values['equipment_type'] = data.equipmentType;
  if (data.status !== undefined) values['status'] = data.status;
  if (data.operationalStatus !== undefined) values['operational_status'] = data.operationalStatus;
  if (data.truckType !== undefined) values['truck_type'] = data.truckType;
  if (data.make !== undefined) values['make'] = data.make;
  if (data.model !== undefined) values['model'] = data.model;
  if (data.year !== undefined) values['year'] = data.year;
  if (data.vin !== undefined) values['vin'] = data.vin;
  if (data.licensePlate !== undefined) values['license_plate'] = data.licensePlate;
  if (data.registrationState !== undefined) values['registration_state'] = data.registrationState;
  if (data.registrationExpiry !== undefined) values['registration_expiry'] = data.registrationExpiry;
  if (data.insurancePolicy !== undefined) values['insurance_policy'] = data.insurancePolicy;
  if (data.insuranceExpiry !== undefined) values['insurance_expiry'] = data.insuranceExpiry;
  if (data.lastMaintenanceDate !== undefined) values['last_maintenance_date'] = data.lastMaintenanceDate;
  if (data.nextMaintenanceDate !== undefined) values['next_maintenance_date'] = data.nextMaintenanceDate;
  if (data.mileage !== undefined) values['mileage'] = data.mileage;
  if (data.fuelType !== undefined) values['fuel_type'] = data.fuelType;
  if (data.capacity !== undefined) values['capacity'] = data.capacity;
  if (data.notes !== undefined) values['notes'] = data.notes;

  if (Object.keys(values).length === 0) {
    return findEquipmentById(id);
  }

  const rows = await sql`
    UPDATE equipment SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${EQUIPMENT_COLUMNS}
  `;
  return rows[0] as Equipment | undefined;
}

export async function deleteEquipment(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM equipment
    WHERE id = ${id}
  `;
  return result.count > 0;
}
