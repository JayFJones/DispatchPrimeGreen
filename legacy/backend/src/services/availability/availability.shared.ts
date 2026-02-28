// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Availability, AvailabilityData, AvailabilityPatch, AvailabilityQuery, AvailabilityService } from './availability.class'

export type { Availability, AvailabilityData, AvailabilityPatch, AvailabilityQuery }

export type AvailabilityClientService = Pick<AvailabilityService<Params<AvailabilityQuery>>, (typeof availabilityMethods)[number]>

export const availabilityPath = 'availability'

export const availabilityMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export const availabilityClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(availabilityPath, connection.service(availabilityPath), {
    methods: availabilityMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [availabilityPath]: AvailabilityClientService
  }
}