// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { ImportPreview, ImportPreviewData, ImportPreviewService } from './import-preview.class'

export type { ImportPreview, ImportPreviewData }

export type ImportPreviewClientService = Pick<ImportPreviewService, 'create'>

export const importPreviewPath = 'import-preview'

export const importPreviewMethods = ['create'] as const

export const importPreviewClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(importPreviewPath, connection.service(importPreviewPath), {
    methods: importPreviewMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [importPreviewPath]: ImportPreviewClientService
  }
}
