// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { DispatchedRoute, DispatchedRouteData, DispatchedRoutePatch, DispatchedRouteQuery } from './dispatched-routes.schema'

export type { DispatchedRoute, DispatchedRouteData, DispatchedRoutePatch, DispatchedRouteQuery }

export interface DispatchedRouteParams extends MongoDBAdapterParams<DispatchedRouteQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class DispatchedRouteService<ServiceParams extends Params = DispatchedRouteParams> extends MongoDBService<
  DispatchedRoute,
  DispatchedRouteData,
  DispatchedRouteParams,
  DispatchedRoutePatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('dispatched-routes'))
  }
}