// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { RouteExecution, RouteExecutionData, RouteExecutionPatch, RouteExecutionQuery, RouteExecutionService } from './route-executions.class'

export type { RouteExecution, RouteExecutionData, RouteExecutionPatch, RouteExecutionQuery }

export type RouteExecutionClientService = Pick<RouteExecutionService<Params<RouteExecutionQuery>>, (typeof routeExecutionMethods)[number]>

export const routeExecutionPath = 'route-executions'

export const routeExecutionMethods: Array<keyof RouteExecutionService> = ['find', 'get', 'create', 'patch', 'remove']

export const routeExecutionClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(routeExecutionPath, connection.service(routeExecutionPath), {
    methods: routeExecutionMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [routeExecutionPath]: RouteExecutionClientService
  }
}