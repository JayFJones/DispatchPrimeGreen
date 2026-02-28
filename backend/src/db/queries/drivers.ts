import type { Driver, DriverCreate, DriverUpdate } from '@dispatch/shared/types/driver';
import sql from '../client.js';

const DRIVER_COLUMNS = sql`
  id,
  first_name             AS "firstName",
  last_name              AS "lastName",
  dob,
  employee_number        AS "employeeNumber",
  geotab_username        AS "geotabUsername",
  license_number         AS "licenseNumber",
  license_state          AS "licenseState",
  license_type           AS "licenseType",
  license_exp_date       AS "licenseExpDate",
  status,
  worker_classification  AS "workerClassification",
  operating_authority    AS "operatingAuthority",
  hire_date              AS "hireDate",
  termination_date       AS "terminationDate",
  rehire_date            AS "rehireDate",
  primary_phone          AS "primaryPhone",
  driving_experience     AS "drivingExperience",
  cdl_driving_experience AS "cdlDrivingExperience",
  total_years_experience AS "totalYearsExperience",
  worklist,
  created_at             AS "createdAt",
  updated_at             AS "updatedAt"
`;

export async function findDriverById(id: string): Promise<Driver | undefined> {
  const rows = await sql`
    SELECT ${DRIVER_COLUMNS}
    FROM drivers
    WHERE id = ${id}
  `;
  return rows[0] as Driver | undefined;
}

export async function listDriversByTerminal(terminalId: string): Promise<Driver[]> {
  const rows = await sql`
    SELECT d.id,
      d.first_name             AS "firstName",
      d.last_name              AS "lastName",
      d.dob,
      d.employee_number        AS "employeeNumber",
      d.geotab_username        AS "geotabUsername",
      d.license_number         AS "licenseNumber",
      d.license_state          AS "licenseState",
      d.license_type           AS "licenseType",
      d.license_exp_date       AS "licenseExpDate",
      d.status,
      d.worker_classification  AS "workerClassification",
      d.operating_authority    AS "operatingAuthority",
      d.hire_date              AS "hireDate",
      d.termination_date       AS "terminationDate",
      d.rehire_date            AS "rehireDate",
      d.primary_phone          AS "primaryPhone",
      d.driving_experience     AS "drivingExperience",
      d.cdl_driving_experience AS "cdlDrivingExperience",
      d.total_years_experience AS "totalYearsExperience",
      d.worklist,
      d.created_at             AS "createdAt",
      d.updated_at             AS "updatedAt"
    FROM drivers d
    INNER JOIN terminal_drivers td ON td.driver_id = d.id
    WHERE td.terminal_id = ${terminalId}
    ORDER BY d.last_name ASC, d.first_name ASC
  `;
  return rows as unknown as Driver[];
}

export async function listBenchDriversByTerminal(terminalId: string): Promise<Driver[]> {
  const rows = await sql`
    SELECT d.id,
      d.first_name             AS "firstName",
      d.last_name              AS "lastName",
      d.dob,
      d.employee_number        AS "employeeNumber",
      d.geotab_username        AS "geotabUsername",
      d.license_number         AS "licenseNumber",
      d.license_state          AS "licenseState",
      d.license_type           AS "licenseType",
      d.license_exp_date       AS "licenseExpDate",
      d.status,
      d.worker_classification  AS "workerClassification",
      d.operating_authority    AS "operatingAuthority",
      d.hire_date              AS "hireDate",
      d.termination_date       AS "terminationDate",
      d.rehire_date            AS "rehireDate",
      d.primary_phone          AS "primaryPhone",
      d.driving_experience     AS "drivingExperience",
      d.cdl_driving_experience AS "cdlDrivingExperience",
      d.total_years_experience AS "totalYearsExperience",
      d.worklist,
      d.created_at             AS "createdAt",
      d.updated_at             AS "updatedAt"
    FROM drivers d
    INNER JOIN terminal_bench_drivers tbd ON tbd.driver_id = d.id
    WHERE tbd.terminal_id = ${terminalId}
    ORDER BY d.last_name ASC, d.first_name ASC
  `;
  return rows as unknown as Driver[];
}

export async function createDriver(data: DriverCreate): Promise<Driver> {
  const rows = await sql`
    INSERT INTO drivers (
      first_name,
      last_name,
      dob,
      employee_number,
      geotab_username,
      license_number,
      license_state,
      license_type,
      license_exp_date,
      status,
      worker_classification,
      operating_authority,
      hire_date,
      termination_date,
      rehire_date,
      primary_phone,
      driving_experience,
      cdl_driving_experience,
      total_years_experience,
      worklist
    ) VALUES (
      ${data.firstName},
      ${data.lastName},
      ${data.dob ?? null},
      ${data.employeeNumber ?? null},
      ${data.geotabUsername ?? null},
      ${data.licenseNumber ?? null},
      ${data.licenseState ?? null},
      ${data.licenseType ?? null},
      ${data.licenseExpDate ?? null},
      ${data.status ?? null},
      ${data.workerClassification ?? null},
      ${data.operatingAuthority ?? null},
      ${data.hireDate ?? null},
      ${data.terminationDate ?? null},
      ${data.rehireDate ?? null},
      ${data.primaryPhone ?? null},
      ${data.drivingExperience ?? null},
      ${data.cdlDrivingExperience ?? null},
      ${data.totalYearsExperience ?? null},
      ${data.worklist ?? null}
    )
    RETURNING ${DRIVER_COLUMNS}
  `;
  return rows[0] as Driver;
}

export async function updateDriver(
  id: string,
  data: DriverUpdate,
): Promise<Driver | undefined> {
  const values: Record<string, unknown> = {};

  if (data.firstName !== undefined) values['first_name'] = data.firstName;
  if (data.lastName !== undefined) values['last_name'] = data.lastName;
  if (data.dob !== undefined) values['dob'] = data.dob;
  if (data.employeeNumber !== undefined) values['employee_number'] = data.employeeNumber;
  if (data.geotabUsername !== undefined) values['geotab_username'] = data.geotabUsername;
  if (data.licenseNumber !== undefined) values['license_number'] = data.licenseNumber;
  if (data.licenseState !== undefined) values['license_state'] = data.licenseState;
  if (data.licenseType !== undefined) values['license_type'] = data.licenseType;
  if (data.licenseExpDate !== undefined) values['license_exp_date'] = data.licenseExpDate;
  if (data.status !== undefined) values['status'] = data.status;
  if (data.workerClassification !== undefined) values['worker_classification'] = data.workerClassification;
  if (data.operatingAuthority !== undefined) values['operating_authority'] = data.operatingAuthority;
  if (data.hireDate !== undefined) values['hire_date'] = data.hireDate;
  if (data.terminationDate !== undefined) values['termination_date'] = data.terminationDate;
  if (data.rehireDate !== undefined) values['rehire_date'] = data.rehireDate;
  if (data.primaryPhone !== undefined) values['primary_phone'] = data.primaryPhone;
  if (data.drivingExperience !== undefined) values['driving_experience'] = data.drivingExperience;
  if (data.cdlDrivingExperience !== undefined) values['cdl_driving_experience'] = data.cdlDrivingExperience;
  if (data.totalYearsExperience !== undefined) values['total_years_experience'] = data.totalYearsExperience;
  if (data.worklist !== undefined) values['worklist'] = data.worklist;

  if (Object.keys(values).length === 0) {
    return findDriverById(id);
  }

  const rows = await sql`
    UPDATE drivers SET
      ${sql(values)}
    WHERE id = ${id}
    RETURNING ${DRIVER_COLUMNS}
  `;
  return rows[0] as Driver | undefined;
}

export async function assignDriverToTerminal(terminalId: string, driverId: string): Promise<void> {
  await sql`
    INSERT INTO terminal_drivers (terminal_id, driver_id)
    VALUES (${terminalId}, ${driverId})
    ON CONFLICT DO NOTHING
  `;
}

export async function removeDriverFromTerminal(terminalId: string, driverId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM terminal_drivers
    WHERE terminal_id = ${terminalId} AND driver_id = ${driverId}
  `;
  return result.count > 0;
}

export async function isDriverInTerminal(terminalId: string, driverId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM terminal_drivers
    WHERE terminal_id = ${terminalId} AND driver_id = ${driverId}
  `;
  return rows.length > 0;
}

export async function assignDriverToBench(terminalId: string, driverId: string): Promise<void> {
  await sql`
    INSERT INTO terminal_bench_drivers (terminal_id, driver_id)
    VALUES (${terminalId}, ${driverId})
    ON CONFLICT DO NOTHING
  `;
}

export async function removeDriverFromBench(terminalId: string, driverId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM terminal_bench_drivers
    WHERE terminal_id = ${terminalId} AND driver_id = ${driverId}
  `;
  return result.count > 0;
}

/** Find a driver by their Geotab username (used during Geotab sync) */
export async function findDriverByGeotabUsername(geotabUsername: string): Promise<Driver | undefined> {
  const rows = await sql`
    SELECT ${DRIVER_COLUMNS}
    FROM drivers
    WHERE geotab_username = ${geotabUsername}
  `;
  return rows[0] as Driver | undefined;
}
