// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type {
  RouteSubstitution,
  RouteSubstitutionData,
  RouteSubstitutionPatch,
  RouteSubstitutionQuery,
  RouteSubstitutionService
} from './route-substitution.class'

export type { RouteSubstitution, RouteSubstitutionData, RouteSubstitutionPatch, RouteSubstitutionQuery }

export type RouteSubstitutionClientService = Pick<
  RouteSubstitutionService<Params<RouteSubstitutionQuery>>,
  'find' | 'get' | 'create' | 'patch' | 'remove' | 'getActiveSubstitutions' | 'getSubstitutionsInRange'
>

export const routeSubstitutionPath = 'route-substitution'

export const routeSubstitutionMethods = ['find', 'get', 'create', 'patch', 'remove', 'getActiveSubstitutions', 'getSubstitutionsInRange'] as const

export const routeSubstitutionClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(routeSubstitutionPath, connection.service(routeSubstitutionPath), {
    methods: routeSubstitutionMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [routeSubstitutionPath]: RouteSubstitutionClientService
  }
}