// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type {
  UserActivity,
  UserActivityData,
  UserActivityPatch,
  UserActivityQuery
} from './user-activities.schema'

export type { UserActivity, UserActivityData, UserActivityPatch, UserActivityQuery }

export interface UserActivityParams extends MongoDBAdapterParams<UserActivityQuery> {
  internal?: boolean
  skipUserIdQuery?: boolean
}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class UserActivityService<ServiceParams extends Params = UserActivityParams> extends MongoDBService<
  UserActivity,
  UserActivityData,
  UserActivityParams,
  UserActivityPatch
> {
  async find(params?: UserActivityParams): Promise<any> {
    return await super.find(params)
  }
}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('useractivities'))
  }
}
