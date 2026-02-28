// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { FleetStatus, FleetStatusData, FleetStatusPatch, FleetStatusQuery, FleetStatusService } from './fleet-status.class'

export type { FleetStatus, FleetStatusData, FleetStatusPatch, FleetStatusQuery }

export type FleetStatusClientService = Pick<FleetStatusService<Params<FleetStatusQuery>>, 'find' | 'get' | 'create' | 'patch' | 'remove'> & {
  bulkCreateFleetSnapshots: (fleetData: any[]) => Promise<FleetStatus[]>
  getLatestFleetStatus: () => Promise<FleetStatus[]>
  getFleetStatusHistory: (deviceId: string, hours?: number) => Promise<FleetStatus[]>
  getFleetStatusByTimeRange: (startTime: string, endTime: string) => Promise<FleetStatus[]>
  getAvailableSnapshots: () => Promise<{ recordedAt: string, count: number }[]>
  getFleetStatusBySnapshot: (recordedAt: string) => Promise<FleetStatus[]>
  getFleetStatusNearLocation: (data: { lat: number, lng: number, radiusMiles?: number }) => Promise<FleetStatus[]>
  getTripData: (data: { fromDate?: string, authData?: any }) => Promise<{ trips: any[], version?: string, fromCache: boolean }>
  clearTripCache: () => Promise<{ success: boolean }>
}

export const fleetStatusPath = 'fleet-status'

export const fleetStatusMethods = ['find', 'get', 'create', 'patch', 'remove', 'bulkCreateFleetSnapshots', 'getLatestFleetStatus', 'getFleetStatusHistory', 'getFleetStatusByTimeRange', 'getAvailableSnapshots', 'getFleetStatusBySnapshot', 'getFleetStatusNearLocation', 'getTripData', 'clearTripCache'] as const

export const fleetStatusClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(fleetStatusPath, connection.service(fleetStatusPath), {
    methods: fleetStatusMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [fleetStatusPath]: FleetStatusClientService
  }
}