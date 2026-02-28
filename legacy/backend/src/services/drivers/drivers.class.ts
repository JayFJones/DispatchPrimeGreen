// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Driver, DriverData, DriverPatch, DriverQuery } from './drivers.schema'

export type { Driver, DriverData, DriverPatch, DriverQuery }

export interface DriverParams extends MongoDBAdapterParams<DriverQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class DriverService<ServiceParams extends Params = DriverParams> extends MongoDBService<
  Driver,
  DriverData,
  DriverParams,
  DriverPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('drivers'))
  }
}