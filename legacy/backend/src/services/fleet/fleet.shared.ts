// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Fleet, FleetData, FleetPatch, FleetQuery, FleetService } from './fleet.class'

export type { Fleet, FleetData, FleetPatch, FleetQuery }

export type FleetClientService = Pick<FleetService<Params<FleetQuery>>, 'find' | 'get' | 'create' | 'patch' | 'remove'>

export const fleetPath = 'fleet'
export const fleetMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export const fleetClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(fleetPath, connection.service(fleetPath), {
    methods: fleetMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [fleetPath]: FleetClientService
  }
}