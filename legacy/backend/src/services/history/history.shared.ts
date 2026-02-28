// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { History, HistoryData, HistoryPatch, HistoryQuery, HistoryService } from './history.class'

export type { History, HistoryData, HistoryPatch, HistoryQuery }

export type HistoryClientService = Pick<HistoryService<Params<HistoryQuery>>, (typeof historyMethods)[number]>

export const historyPath = 'history'

export const historyMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export const historyClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(historyPath, connection.service(historyPath), {
    methods: historyMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [historyPath]: HistoryClientService
  }
}