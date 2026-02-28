// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type {
  UserActivity,
  UserActivityData,
  UserActivityPatch,
  UserActivityQuery,
  UserActivityService
} from './user-activities.class'

export type { UserActivity, UserActivityData, UserActivityPatch, UserActivityQuery }

export type UserActivityClientService = Pick<
  UserActivityService<Params<UserActivityQuery>>,
  (typeof userActivityMethods)[number]
>

export const userActivityPath = 'user-activities'

export const userActivityMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export const userActivityClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(userActivityPath, connection.service(userActivityPath), {
    methods: userActivityMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [userActivityPath]: UserActivityClientService
  }
}
