// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { RouteStop, RouteStopData, RouteStopPatch, RouteStopQuery } from './route-stops.schema'

export type { RouteStop, RouteStopData, RouteStopPatch, RouteStopQuery }

export interface RouteStopParams extends MongoDBAdapterParams<RouteStopQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class RouteStopService<ServiceParams extends Params = RouteStopParams> extends MongoDBService<
  RouteStop,
  RouteStopData,
  RouteStopParams,
  RouteStopPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('route-stops'))
  }
}
