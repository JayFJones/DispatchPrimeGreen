// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { RouteExecution, RouteExecutionData, RouteExecutionPatch, RouteExecutionQuery } from './route-executions.schema'

export type { RouteExecution, RouteExecutionData, RouteExecutionPatch, RouteExecutionQuery }

export interface RouteExecutionParams extends MongoDBAdapterParams<RouteExecutionQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class RouteExecutionService<ServiceParams extends Params = RouteExecutionParams> extends MongoDBService<
  RouteExecution,
  RouteExecutionData,
  RouteExecutionParams,
  RouteExecutionPatch
> {}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('route-executions'))
  }
}