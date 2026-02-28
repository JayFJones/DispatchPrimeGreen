// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Equipment, EquipmentData, EquipmentPatch, EquipmentQuery, EquipmentService } from './equipment.class'

export type { Equipment, EquipmentData, EquipmentPatch, EquipmentQuery }

export type EquipmentClientService = Pick<EquipmentService<Params<EquipmentQuery>>, (typeof equipmentMethods)[number]>

export const equipmentPath = 'equipment'

export const equipmentMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export const equipmentClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(equipmentPath, connection.service(equipmentPath), {
    methods: equipmentMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [equipmentPath]: EquipmentClientService
  }
}