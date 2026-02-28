/** Geotab API response shapes — these mirror what the Geotab JSON-RPC API returns */

/** Credentials needed to make authenticated Geotab API calls */
export interface GeotabCredentials {
  sessionId: string;
  database: string;
  userName: string;
  server: string;
}

/** Result from Geotab Authenticate method */
export interface GeotabAuthResult {
  credentials: {
    sessionId: string;
    database: string;
    userName: string;
  };
  /** The server URL to use for subsequent API calls */
  path: string;
}

/** Geotab Device entity (vehicle/asset tracker) */
export interface GeotabDevice {
  id: string;
  name: string;
  serialNumber: string;
  vehicleIdentificationNumber?: string;
  licensePlate?: string;
  licenseState?: string;
  groups?: GeotabGroupReference[];
  comment?: string;
}

/** Geotab DeviceStatusInfo — real-time device/vehicle status */
export interface GeotabDeviceStatus {
  device: { id: string };
  bearing: number;
  currentStateDuration: string;
  isDeviceCommunicating: boolean;
  isDriving: boolean;
  isHistoricLastDriver: boolean;
  latitude: number;
  longitude: number;
  speed: number;
  dateTime: string;
  driver?: { id: string };
}

/** Geotab User entity — represents a driver in Geotab */
export interface GeotabDriver {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  employeeNo?: string;
  isDriver: boolean;
  driverGroups?: GeotabGroupReference[];
  keys?: Array<{ serialNumber: string }>;
}

/** Geotab Group entity — organizational unit */
export interface GeotabGroup {
  id: string;
  name: string;
  parent?: { id: string };
  children?: GeotabGroupReference[];
  color?: { a: number; b: number; g: number; r: number };
  comments?: string;
}

/** Minimal group reference as used in device/user group arrays */
export interface GeotabGroupReference {
  id: string;
}

/** Combined fleet status entry — built from Device + DeviceStatusInfo + Driver data */
export interface FleetStatusEntry {
  deviceId: string;
  deviceName: string;
  serialNumber: string;
  vin?: string;
  latitude: number;
  longitude: number;
  speed: number;
  bearing: number;
  isDriving: boolean;
  isDeviceCommunicating: boolean;
  currentStateDuration: string;
  dateTime: string;
  driverId?: string;
  driverName?: string;
}
