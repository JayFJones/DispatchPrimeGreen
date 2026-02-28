// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { ImportProcess, ImportProcessData, ImportProcessService } from './import-process.class'

export type { ImportProcess, ImportProcessData }

export type ImportProcessClientService = Pick<ImportProcessService, 'create'>

export const importProcessPath = 'import-process'

export const importProcessMethods = ['create'] as const

export const importProcessClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(importProcessPath, connection.service(importProcessPath), {
    methods: importProcessMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [importProcessPath]: ImportProcessClientService
  }
}
