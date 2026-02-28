// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Route, RouteData, RoutePatch, RouteQuery } from './routes.schema'

export type { Route, RouteData, RoutePatch, RouteQuery }

export interface RouteParams extends MongoDBAdapterParams<RouteQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class RouteService<ServiceParams extends Params = RouteParams> extends MongoDBService<
  Route,
  RouteData,
  RouteParams,
  RoutePatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('routes'))
  }
}
