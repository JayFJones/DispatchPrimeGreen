// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type {
  RouteStop,
  RouteStopData,
  RouteStopPatch,
  RouteStopQuery,
  RouteStopService
} from './route-stops.class'

export type { RouteStop, RouteStopData, RouteStopPatch, RouteStopQuery }

export type RouteStopClientService = Pick<
  RouteStopService<Params<RouteStopQuery>>,
  (typeof routeStopMethods)[number]
>

export const routeStopPath = 'route-stops'

export const routeStopMethods: Array<keyof RouteStopService> = ['find', 'get', 'create', 'patch', 'remove']

export const routeStopClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(routeStopPath, connection.service(routeStopPath), {
    methods: routeStopMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [routeStopPath]: RouteStopClientService
  }
}
