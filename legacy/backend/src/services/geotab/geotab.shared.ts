// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Geotab, GeotabData, GeotabPatch, GeotabQuery, GeotabAuth, GeotabService } from './geotab.class'

export type { Geotab, GeotabData, GeotabPatch, GeotabQuery, GeotabAuth }

export type GeotabClientService = Pick<GeotabService<Params<GeotabQuery>>, 'find' | 'get' | 'create' | 'patch' | 'remove'> & {
  authenticate: (authData: GeotabAuth) => Promise<{ success: boolean, sessionId?: string, server?: string, error?: string }>
  getAuthStatus: () => Promise<Geotab | null>
  isSessionValid: () => Promise<boolean>
  logout: () => Promise<boolean>
  testConnection: () => Promise<{ success: boolean, error?: string, version?: string }>
  getDevices: (authData: GeotabAuth) => Promise<{ success: boolean, devices?: any[], error?: string }>
  getRealTimeFleetInfo: (authData: GeotabAuth) => Promise<{ success: boolean, deviceData?: any[], deviceStatusData?: any[], userData?: any[], combinedData?: any[], error?: string }>
  getMemoryAuthStatus: () => Promise<{ isAuthenticated: boolean, database?: string, username?: string }>
  getCachedFleetData: () => Promise<{ data: any[], timestamp?: Date, isStale?: boolean }>
  getPollingStatus: () => Promise<{ isPolling: boolean, lastSnapshot?: Date, nextSnapshot?: Date, intervalMinutes: number }>
  clearMemoryAuth: () => Promise<boolean>
  triggerImmediatePoll: () => Promise<{ success: boolean, message?: string }>
  getFleetDataSmart: () => Promise<{ success: boolean, data?: any[], source?: string, timestamp?: Date, error?: string }>
  getTripData: (data: { fromDate?: string, authData?: any }) => Promise<{ trips: any[], version?: string, fromCache: boolean }>
  clearTripCache: () => Promise<{ success: boolean }>
  getDriverData: (data: { authData?: any }) => Promise<{ drivers: any[], version?: string, fromCache: boolean }>
  clearDriverCache: () => Promise<{ success: boolean }>
  getDeviceData: (data: { authData?: any }) => Promise<{ devices: any[], version?: string, fromCache: boolean }>
  clearDeviceCache: () => Promise<{ success: boolean }>
  getGroupData: (data: { authData?: any }) => Promise<{ groups: any[], version?: string, fromCache: boolean }>
  clearGroupCache: () => Promise<{ success: boolean }>
  updateDatabaseGroups: (data: { authData?: any }) => Promise<{ success: boolean, driversUpdated?: number, devicesUpdated?: number, error?: string }>
  getRouteProgress: (data: { truckNumber?: string, driverGeotabId?: string, routeId?: string, authData: GeotabAuth }) => Promise<{ success: boolean, vehicleStatus?: any, error?: string }>
  getFleetRouteStatus: (data: { routes: Array<{ routeId: string, truckNumber?: string, driverGeotabId?: string }>, authData: GeotabAuth }) => Promise<{ success: boolean, routeStatuses?: Array<any>, error?: string }>
}

export const geotabPath = 'geotab'
export const geotabMethods = ['find', 'get', 'create', 'patch', 'remove', 'authenticate', 'getAuthStatus', 'isSessionValid', 'logout', 'testConnection', 'getDevices', 'getRealTimeFleetInfo', 'getMemoryAuthStatus', 'getCachedFleetData', 'getPollingStatus', 'clearMemoryAuth', 'triggerImmediatePoll', 'getFleetDataSmart', 'getTripData', 'clearTripCache', 'getDriverData', 'clearDriverCache', 'getDeviceData', 'clearDeviceCache', 'getGroupData', 'clearGroupCache', 'updateDatabaseGroups', 'getRouteProgress', 'getFleetRouteStatus'] as const

export const geotabClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(geotabPath, connection.service(geotabPath), {
    methods: geotabMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [geotabPath]: GeotabClientService
  }
}