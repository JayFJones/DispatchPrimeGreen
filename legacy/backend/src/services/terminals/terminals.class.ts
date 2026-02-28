// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Terminal, TerminalData, TerminalPatch, TerminalQuery } from './terminals.schema'

export type { Terminal, TerminalData, TerminalPatch, TerminalQuery }

export interface TerminalParams extends MongoDBAdapterParams<TerminalQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class TerminalService<ServiceParams extends Params = TerminalParams> extends MongoDBService<
  Terminal,
  TerminalData,
  TerminalParams,
  TerminalPatch
> {
  async get(id: string, params?: ServiceParams): Promise<Terminal> {
    // First try the standard ObjectID lookup
    if (this.isValidObjectId(id)) {
      return super.get(id, params)
    }
    
    // If not a valid ObjectID, try to find by cName (URL-compliant name)
    const result = await this.find({
      query: { cName: id },
      paginate: false
    } as any)
    
    const terminals = Array.isArray(result) ? result : result.data || []
    if (terminals.length > 0) {
      return terminals[0]
    }
    
    // If not found by cName, fall back to original behavior (will throw NotFound)
    return super.get(id, params)
  }
  
  private isValidObjectId(id: string): boolean {
    // MongoDB ObjectId is 24 hex characters
    return /^[0-9a-fA-F]{24}$/.test(id)
  }
}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('terminals'))
  }
}
