// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Driver, DriverData, DriverPatch, DriverQuery, DriverService } from './drivers.class'

export type { Driver, DriverData, DriverPatch, DriverQuery }

export type DriverClientService = Pick<
  DriverService<Params<DriverQuery>>,
  (typeof driverMethods)[number]
>

export const driverPath = 'drivers'

export const driverMethods: Array<keyof DriverService> = ['find', 'get', 'create', 'patch', 'remove']

export const driverClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(driverPath, connection.service(driverPath), {
    methods: driverMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [driverPath]: DriverClientService
  }
}