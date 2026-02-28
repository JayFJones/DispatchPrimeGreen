import type { GeotabSessionPublic } from '@dispatch/shared/types/geotab-session';
import type { GeotabCredentials, GeotabDevice, GeotabDriver, GeotabGroup, GeotabDeviceStatus, FleetStatusEntry } from '../geotab/types.js';
import { encryptPassword, decryptPassword } from '../geotab/encryption.js';
import { geotabAuthenticate, geotabCall, geotabMultiCall, GeotabApiError } from '../geotab/api-client.js';
import { deviceCache, driverCache, groupCache } from '../geotab/cache.js';
import {
  findSessionByUserId,
  findSessionPublicByUserId,
  upsertSession,
  updateSessionToken,
  markSessionUnauthenticated,
  deleteSession,
} from '../db/queries/geotab-sessions.js';
import { findTerminalById } from '../db/queries/terminals.js';
import { findDriverByGeotabUsername } from '../db/queries/drivers.js';
import { findVehicleByGeotabDeviceId, findVehicleByTruckId, updateVehicle } from '../db/queries/vehicles.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

const SESSION_DURATION_DAYS = 14;

export class GeotabServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'GeotabServiceError';
  }
}

/**
 * Authenticate with Geotab and store encrypted credentials.
 * Returns the public session data (no encrypted password).
 */
export async function authenticateGeotab(
  userId: string,
  data: { database: string; username: string; password: string },
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<GeotabSessionPublic> {
  let authResult;
  try {
    authResult = await geotabAuthenticate(data.database, data.username, data.password);
  } catch (err) {
    if (err instanceof GeotabApiError) {
      throw new GeotabServiceError(
        `Geotab authentication failed: ${err.message}`,
        err.code,
        err.code === 'GEOTAB_NETWORK_ERROR' ? 502 : 401,
      );
    }
    throw err;
  }

  const encrypted = encryptPassword(data.password);
  const authExpiry = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Geotab returns the server as "path" — may be a full URL or just a hostname
  const server = authResult.path.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const session = await upsertSession({
    userId,
    database: data.database,
    username: data.username,
    encryptedPassword: encrypted,
    sessionId: authResult.credentials.sessionId,
    server,
    authExpiry,
  });

  // Invalidate caches for this user since they may now see different data
  deviceCache.invalidate(userId);
  driverCache.invalidate(userId);
  groupCache.invalidate(userId);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'user',
    entityId: userId,
    userId,
    summary: `Geotab authentication successful for database "${data.database}"`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return session;
}

/** Get the current Geotab auth status for a user (no password exposed) */
export async function getAuthStatus(userId: string): Promise<GeotabSessionPublic | null> {
  const session = await findSessionPublicByUserId(userId);
  return session ?? null;
}

/** Remove stored Geotab credentials for a user */
export async function removeGeotabAuth(
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const deleted = await deleteSession(userId);
  if (!deleted) {
    throw new GeotabServiceError('No Geotab session found', 'GEOTAB_NOT_AUTHENTICATED', 404);
  }

  deviceCache.invalidate(userId);
  driverCache.invalidate(userId);
  groupCache.invalidate(userId);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'user',
    entityId: userId,
    userId,
    summary: 'Geotab credentials removed',
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}

/**
 * Internal helper: resolve valid Geotab credentials for a user.
 * Re-authenticates transparently if the session has expired.
 */
async function getResolvedCredentials(userId: string): Promise<GeotabCredentials> {
  const session = await findSessionByUserId(userId);
  if (!session || !session.isAuthenticated) {
    throw new GeotabServiceError(
      'Not authenticated with Geotab. Please authenticate first.',
      'GEOTAB_NOT_AUTHENTICATED',
      401,
    );
  }

  // Check if session has expired
  const isExpired = session.authExpiry && new Date(session.authExpiry) < new Date();

  if (!isExpired && session.sessionId && session.server) {
    return {
      sessionId: session.sessionId,
      database: session.database,
      userName: session.username,
      server: session.server,
    };
  }

  // Re-authenticate using stored encrypted password
  let password: string;
  try {
    password = decryptPassword(session.encryptedPassword);
  } catch {
    await markSessionUnauthenticated(userId);
    throw new GeotabServiceError(
      'Failed to decrypt stored Geotab credentials. Please re-authenticate.',
      'GEOTAB_CREDENTIALS_INVALID',
      401,
    );
  }

  let authResult;
  try {
    authResult = await geotabAuthenticate(session.database, session.username, password);
  } catch (err) {
    await markSessionUnauthenticated(userId);
    if (err instanceof GeotabApiError) {
      throw new GeotabServiceError(
        `Geotab re-authentication failed: ${err.message}`,
        err.code,
        err.code === 'GEOTAB_NETWORK_ERROR' ? 502 : 401,
      );
    }
    throw err;
  }

  const server = authResult.path.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const authExpiry = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await updateSessionToken(userId, authResult.credentials.sessionId, server, authExpiry);

  return {
    sessionId: authResult.credentials.sessionId,
    database: session.database,
    userName: session.username,
    server,
  };
}

/** Fetch Geotab devices (24h cached per user) */
export async function getDevices(userId: string): Promise<{ data: GeotabDevice[]; fromCache: boolean }> {
  const cached = deviceCache.get(userId) as GeotabDevice[] | undefined;
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const credentials = await getResolvedCredentials(userId);
  const data = await geotabCall<GeotabDevice[]>(credentials, 'Get', { typeName: 'Device' });

  deviceCache.set(userId, data);
  return { data, fromCache: false };
}

/** Fetch Geotab drivers/users (24h cached per user) */
export async function getDrivers(userId: string): Promise<{ data: GeotabDriver[]; fromCache: boolean }> {
  const cached = driverCache.get(userId) as GeotabDriver[] | undefined;
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const credentials = await getResolvedCredentials(userId);
  const data = await geotabCall<GeotabDriver[]>(credentials, 'Get', {
    typeName: 'User',
    search: { isDriver: true },
  });

  driverCache.set(userId, data);
  return { data, fromCache: false };
}

/** Fetch Geotab groups (24h cached per user) */
export async function getGroups(userId: string): Promise<{ data: GeotabGroup[]; fromCache: boolean }> {
  const cached = groupCache.get(userId) as GeotabGroup[] | undefined;
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const credentials = await getResolvedCredentials(userId);
  const data = await geotabCall<GeotabGroup[]>(credentials, 'Get', { typeName: 'Group' });

  groupCache.set(userId, data);
  return { data, fromCache: false };
}

/** Fetch real-time fleet status (never cached) */
export async function getFleetStatus(userId: string): Promise<FleetStatusEntry[]> {
  const credentials = await getResolvedCredentials(userId);

  const [devices, statuses, drivers] = await geotabMultiCall<[GeotabDevice[], GeotabDeviceStatus[], GeotabDriver[]]>(
    credentials,
    [
      { method: 'Get', params: { typeName: 'Device' } },
      { method: 'Get', params: { typeName: 'DeviceStatusInfo' } },
      { method: 'Get', params: { typeName: 'User', search: { isDriver: true } } },
    ],
  );

  // Build lookup maps
  const deviceMap = new Map<string, GeotabDevice>();
  for (const device of devices) {
    deviceMap.set(device.id, device);
  }

  const driverMap = new Map<string, GeotabDriver>();
  for (const driver of drivers) {
    driverMap.set(driver.id, driver);
  }

  // Combine status entries with device and driver info
  const entries: FleetStatusEntry[] = [];
  for (const status of statuses) {
    const device = deviceMap.get(status.device.id);
    if (!device) continue;

    const driver = status.driver ? driverMap.get(status.driver.id) : undefined;

    entries.push({
      deviceId: device.id,
      deviceName: device.name,
      serialNumber: device.serialNumber,
      vin: device.vehicleIdentificationNumber,
      latitude: status.latitude,
      longitude: status.longitude,
      speed: status.speed,
      bearing: status.bearing,
      isDriving: status.isDriving,
      isDeviceCommunicating: status.isDeviceCommunicating,
      currentStateDuration: status.currentStateDuration,
      dateTime: status.dateTime,
      driverId: driver?.id,
      driverName: driver ? `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() || driver.name : undefined,
    });
  }

  return entries;
}

interface SyncResult {
  drivers: {
    matched: number;
    unmatched: number;
    updated: number;
    unmatchedNames: string[];
  };
  vehicles: {
    matched: number;
    unmatched: number;
    updated: number;
    unmatchedNames: string[];
  };
}

/**
 * Sync Geotab data into local DB for a terminal.
 * Only updates metadata on already-matched records — does not auto-create.
 */
export async function syncGeotabData(
  userId: string,
  terminalId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<SyncResult> {
  const terminal = await findTerminalById(terminalId);
  if (!terminal) {
    throw new GeotabServiceError('Terminal not found', 'TERMINAL_NOT_FOUND', 404);
  }

  if (!terminal.geotabGroupId) {
    throw new GeotabServiceError(
      'Terminal does not have a Geotab group configured',
      'TERMINAL_NO_GEOTAB_GROUP',
      400,
    );
  }

  const credentials = await getResolvedCredentials(userId);

  // Fetch fresh data from Geotab (bypass cache)
  const [geotabDevices, geotabDrivers] = await geotabMultiCall<[GeotabDevice[], GeotabDriver[]]>(
    credentials,
    [
      { method: 'Get', params: { typeName: 'Device' } },
      { method: 'Get', params: { typeName: 'User', search: { isDriver: true } } },
    ],
  );

  const result: SyncResult = {
    drivers: { matched: 0, unmatched: 0, updated: 0, unmatchedNames: [] },
    vehicles: { matched: 0, unmatched: 0, updated: 0, unmatchedNames: [] },
  };

  // Filter to devices/drivers in this terminal's Geotab group
  const terminalGroupId = terminal.geotabGroupId;

  const isInGroup = (groups: Array<{ id: string }> | undefined): boolean => {
    if (!groups) return false;
    return groups.some((g) => g.id === terminalGroupId);
  };

  // Sync drivers: match by geotabUsername
  const terminalDrivers = geotabDrivers.filter(
    (d) => d.isDriver && isInGroup(d.driverGroups),
  );

  for (const gDriver of terminalDrivers) {
    if (!gDriver.name) {
      result.drivers.unmatched++;
      result.drivers.unmatchedNames.push(gDriver.id);
      continue;
    }

    const localDriver = await findDriverByGeotabUsername(gDriver.name);
    if (!localDriver) {
      result.drivers.unmatched++;
      const displayName = `${gDriver.firstName ?? ''} ${gDriver.lastName ?? ''}`.trim() || gDriver.name;
      result.drivers.unmatchedNames.push(displayName);
      continue;
    }

    result.drivers.matched++;
    // We could update metadata here in the future, but per plan,
    // sync currently only reports matches. Driver updates require
    // deliberate terminal_manager action.
  }

  // Sync vehicles: match by geotabDeviceId, fallback to truckId (device name)
  const terminalDevices = geotabDevices.filter((d) => isInGroup(d.groups));

  for (const gDevice of terminalDevices) {
    // Try to match by geotabDeviceId first
    let localVehicle = await findVehicleByGeotabDeviceId(gDevice.id);

    // Fallback: match by device name → truckId
    if (!localVehicle) {
      localVehicle = await findVehicleByTruckId(gDevice.name);
    }

    if (!localVehicle) {
      result.vehicles.unmatched++;
      result.vehicles.unmatchedNames.push(gDevice.name);
      continue;
    }

    result.vehicles.matched++;

    // Update vehicle metadata from Geotab
    const updates: Record<string, unknown> = {};
    if (gDevice.vehicleIdentificationNumber && gDevice.vehicleIdentificationNumber !== localVehicle.vin) {
      updates['vin'] = gDevice.vehicleIdentificationNumber;
    }
    if (gDevice.licensePlate && gDevice.licensePlate !== localVehicle.licensePlate) {
      updates['licensePlate'] = gDevice.licensePlate;
    }
    if (gDevice.licenseState && gDevice.licenseState !== localVehicle.licenseState) {
      updates['licenseState'] = gDevice.licenseState;
    }
    if (!localVehicle.geotabDeviceId) {
      updates['geotabDeviceId'] = gDevice.id;
    }

    if (Object.keys(updates).length > 0) {
      await updateVehicle(localVehicle.id, updates);
      result.vehicles.updated++;
    }
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'terminal',
    entityId: terminalId,
    userId,
    summary: `Geotab sync completed: ${result.drivers.matched} drivers matched, ${result.vehicles.matched} vehicles matched, ${result.vehicles.updated} vehicles updated`,
    metadata: result as unknown as Record<string, unknown>,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return result;
}
