// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from '../../client'
import type { Customer, CustomerData, CustomerPatch, CustomerQuery, CustomerService } from './customers.class'

export type { Customer, CustomerData, CustomerPatch, CustomerQuery }

export type CustomerClientService = Pick<
  CustomerService<Params<CustomerQuery>>,
  (typeof customerMethods)[number]
>

export const customerPath = 'customers'

export const customerMethods: Array<keyof CustomerService> = ['find', 'get', 'create', 'patch', 'remove']

export const customerClient = (client: ClientApplication) => {
  const connection = client.get('connection')

  client.use(customerPath, connection.service(customerPath), {
    methods: customerMethods
  })
}

// Add this service to the client service type index
declare module '../../client' {
  interface ServiceTypes {
    [customerPath]: CustomerClientService
  }
}
