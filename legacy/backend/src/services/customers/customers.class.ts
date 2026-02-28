// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Customer, CustomerData, CustomerPatch, CustomerQuery } from './customers.schema'

export type { Customer, CustomerData, CustomerPatch, CustomerQuery }

export interface CustomerParams extends MongoDBAdapterParams<CustomerQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class CustomerService<ServiceParams extends Params = CustomerParams> extends MongoDBService<
  Customer,
  CustomerData,
  CustomerParams,
  CustomerPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('customers'))
  }
}
