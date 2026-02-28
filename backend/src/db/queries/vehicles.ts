import type { Vehicle, VehicleCreate, VehicleUpdate } from '@dispatch/shared/types/vehicle';
import sql from '../client.js';

const VEHICLE_COLUMNS = sql`
  id,
  truck_id                  AS "truckId",
  vin,
  license_plate             AS "licensePlate",
  license_state             AS "licenseState",
  odometer::float8          AS odometer,
  vehicle_type              AS "vehicleType",
  status,
  geotab_device_id          AS "geotabDeviceId",
  last_location_latitude::float8   AS "lastLocationLatitude",
  last_location_longitude::float8  AS "lastLocationLongitude",
  last_location_updated     AS "lastLocationUpdated",
  notes,
  created_at                AS "createdAt",
  updated_at                AS "updatedAt"
`;

export async function findVehicleById(id: string): Promise<Vehicle | undefined> {
  const rows = await sql`
    SELECT ${VEHICLE_COLUMNS}
    FROM vehicles
    WHERE id = ${id}
  `;
  return rows[0] as Vehicle | undefined;
}

export async function listVehiclesByTerminal(terminalId: string): Promise<Vehicle[]> {
  const rows = await sql`
    SELECT
      v.id,
      v.truck_id                  AS "truckId",
      v.vin,
      v.license_plate             AS "licensePlate",
      v.license_state             AS "licenseState",
      v.odometer::float8          AS odometer,
      v.vehicle_type              AS "vehicleType",
      v.status,
      v.geotab_device_id          AS "geotabDeviceId",
      v.last_location_latitude::float8   AS "lastLocationLatitude",
      v.last_location_longitude::float8  AS "lastLocationLongitude",
      v.last_location_updated     AS "lastLocationUpdated",
      v.notes,
      v.created_at                AS "createdAt",
      v.updated_at                AS "updatedAt"
    FROM vehicles v
    INNER JOIN terminal_vehicles tv ON tv.vehicle_id = v.id
    WHERE tv.terminal_id = ${terminalId}
    ORDER BY v.truck_id ASC
  `;
  return rows as unknown as Vehicle[];
}

export async function createVehicle(data: VehicleCreate): Promise<Vehicle> {
  const rows = await sql`
    INSERT INTO vehicles (
      truck_id,
      vin,
      license_plate,
      license_state,
      odometer,
      vehicle_type,
      status,
      geotab_device_id,
      last_location_latitude,
      last_location_longitude,
      last_location_updated,
      notes
    ) VALUES (
      ${data.truckId},
      ${data.vin ?? null},
      ${data.licensePlate ?? null},
      ${data.licenseState ?? null},
      ${data.odometer ?? null},
      ${data.vehicleType ?? null},
      ${data.status ?? 'active'},
      ${data.geotabDeviceId ?? null},
      ${data.lastLocationLatitude ?? null},
      ${data.lastLocationLongitude ?? null},
      ${data.lastLocationUpdated ?? null},
      ${data.notes ?? null}
    )
    RETURNING ${VEHICLE_COLUMNS}
  `;
  return rows[0] as Vehicle;
}

export async function updateVehicle(
  id: string,
  data: VehicleUpdate,
): Promise<Vehicle | undefined> {
  const values: Record<string, unknown> = {};

  if (data.truckId !== undefined) values['truck_id'] = data.truckId;
  if (data.vin !== undefined) values['vin'] = data.vin;
  if (data.licensePlate !== undefined) values['license_plate'] = data.licensePlate;
  if (data.licenseState !== undefined) values['license_state'] = data.licenseState;
  if (data.odometer !== undefined) values['odometer'] = data.odometer;
  if (data.vehicleType !== undefined) values['vehicle_type'] = data.vehicleType;
  if (data.status !== undefined) values['status'] = data.status;
  if (data.geotabDeviceId !== undefined) values['geotab_device_id'] = data.geotabDeviceId;
  if (data.lastLocationLatitude !== undefined) values['last_location_latitude'] = data.lastLocationLatitude;
  if (data.lastLocationLongitude !== undefined) values['last_location_longitude'] = data.lastLocationLongitude;
  if (data.lastLocationUpdated !== undefined) values['last_location_updated'] = data.lastLocationUpdated;
  if (data.notes !== undefined) values['notes'] = data.notes;

  if (Object.keys(values).length === 0) {
    return findVehicleById(id);
  }

  const rows = await sql`
    UPDATE vehicles SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${VEHICLE_COLUMNS}
  `;
  return rows[0] as Vehicle | undefined;
}

export async function assignVehicleToTerminal(terminalId: string, vehicleId: string): Promise<void> {
  await sql`
    INSERT INTO terminal_vehicles (terminal_id, vehicle_id)
    VALUES (${terminalId}, ${vehicleId})
    ON CONFLICT DO NOTHING
  `;
}

export async function removeVehicleFromTerminal(terminalId: string, vehicleId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM terminal_vehicles
    WHERE terminal_id = ${terminalId} AND vehicle_id = ${vehicleId}
  `;
  return result.count > 0;
}
