// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type {
  RouteSubstitution,
  RouteSubstitutionData,
  RouteSubstitutionPatch,
  RouteSubstitutionQuery
} from './route-substitution.schema'

export type { RouteSubstitution, RouteSubstitutionData, RouteSubstitutionPatch, RouteSubstitutionQuery }

export interface RouteSubstitutionParams extends MongoDBAdapterParams<RouteSubstitutionQuery> {}

export interface RouteSubstitutionServiceParams extends Params<RouteSubstitutionQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class RouteSubstitutionService<ServiceParams extends Params = RouteSubstitutionParams> extends MongoDBService<
  RouteSubstitution,
  RouteSubstitutionData,
  RouteSubstitutionParams,
  RouteSubstitutionPatch
> {
  constructor(options: MongoDBAdapterOptions) {
    super(options)
  }

  // Custom method to get active substitutions for a route on a specific date
  async getActiveSubstitutions(routeId: string, date?: string): Promise<RouteSubstitution[]> {
    const queryDate = date || new Date().toISOString().split('T')[0]
    
    const query = {
      routeId,
      $or: [
        // No start date (immediate) and no end date (ongoing)
        { startDate: { $exists: false }, endDate: { $exists: false } },
        // No start date (immediate) and end date after query date
        { startDate: { $exists: false }, endDate: { $gte: queryDate } },
        // Start date before or on query date and no end date (ongoing)
        { startDate: { $lte: queryDate }, endDate: { $exists: false } },
        // Start date before or on query date and end date after query date
        { startDate: { $lte: queryDate }, endDate: { $gte: queryDate } }
      ]
    }

    const result = await this.find({
      query,
      paginate: false
    } as unknown as ServiceParams)

    return Array.isArray(result) ? result : result.data
  }

  // Custom method to get all substitutions that affect a date range
  async getSubstitutionsInRange(startDate: string, endDate: string, routeId?: string): Promise<RouteSubstitution[]> {
    const query: any = {
      $or: [
        // No start date (immediate) and no end date (ongoing)
        { startDate: { $exists: false }, endDate: { $exists: false } },
        // No start date (immediate) and end date within or after range
        { startDate: { $exists: false }, endDate: { $gte: startDate } },
        // Start date within or before range and no end date (ongoing)
        { startDate: { $lte: endDate }, endDate: { $exists: false } },
        // Start date within or before range and end date within or after range
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    }

    if (routeId) {
      query.routeId = routeId
    }

    const result = await this.find({
      query,
      paginate: false
    } as unknown as ServiceParams)

    return Array.isArray(result) ? result : result.data
  }
}

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db) => db.collection('route-substitutions'))
  }
}