// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Route, RouteData, RoutePatch, RouteQuery, RouteService } from './routes.class'

export type { Route, RouteData, RoutePatch, RouteQuery }

export type RouteClientService = Pick<RouteService<Params<RouteQuery>>, (typeof routeMethods)[number]>

export const routePath = 'routes'

export const routeMethods: Array<keyof RouteService> = ['find', 'get', 'create', 'patch', 'remove']

export const routeClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(routePath, connection.service(routePath), {
    methods: routeMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [routePath]: RouteClientService
  }
}
