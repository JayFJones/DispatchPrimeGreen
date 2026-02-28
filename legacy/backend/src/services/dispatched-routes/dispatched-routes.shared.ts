// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { DispatchedRoute, DispatchedRouteData, DispatchedRoutePatch, DispatchedRouteQuery, DispatchedRouteService } from './dispatched-routes.class'

export type { DispatchedRoute, DispatchedRouteData, DispatchedRoutePatch, DispatchedRouteQuery }

export type DispatchedRouteClientService = Pick<DispatchedRouteService<Params<DispatchedRouteQuery>>, (typeof dispatchedRouteMethods)[number]>

export const dispatchedRoutePath = 'dispatched-routes'

export const dispatchedRouteMethods: Array<keyof DispatchedRouteService> = ['find', 'get', 'create', 'patch', 'remove']

export const dispatchedRouteClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(dispatchedRoutePath, connection.service(dispatchedRoutePath), {
    methods: dispatchedRouteMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [dispatchedRoutePath]: DispatchedRouteClientService
  }
}