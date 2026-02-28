// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { History, HistoryData, HistoryPatch, HistoryQuery } from './history.schema'

export type { History, HistoryData, HistoryPatch, HistoryQuery }

export interface HistoryParams extends MongoDBAdapterParams<HistoryQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class HistoryService<ServiceParams extends Params = HistoryParams> extends MongoDBService<
  History,
  HistoryData,
  HistoryParams,
  HistoryPatch
> {
  constructor(options: MongoDBAdapterOptions) {
    super(options)
  }

  // Custom method to create availability history
  async createAvailabilityHistory(
    driverId: string,
    userId: string,
    availabilityData: {
      startDate: string
      endDate: string
      type: string
      notes?: string
    }
  ): Promise<History> {
    const historyEntry: HistoryData = {
      historyType: 'availability',
      entityType: 'driver',
      entityId: driverId,
      timestamp: new Date().toISOString(),
      userId,
      summary: `Availability updated: ${availabilityData.type}${
        availabilityData.startDate && availabilityData.endDate
          ? ` from ${availabilityData.startDate} to ${availabilityData.endDate}`
          : ''
      }`,
      data: {
        startDate: availabilityData.startDate,
        endDate: availabilityData.endDate,
        availabilityType: availabilityData.type,
        originalNotes: availabilityData.notes
      },
      notes: availabilityData.notes
    }

    return this.create(historyEntry)
  }

  // Custom method to create driver contact history
  async createDriverContactHistory(
    driverId: string,
    userId: string,
    contactData: {
      date: string
      time: string
      notes?: string
      outcome?: Record<string, boolean>
      phoneNumber?: string
    }
  ): Promise<History> {
    // Build summary based on call outcomes
    let summary = 'Driver contact made'
    if (contactData.outcome) {
      const outcomes = Object.entries(contactData.outcome)
        .filter(([_, value]) => value)
        .map(([key, _]) => {
          // Convert camelCase to readable format
          return key.replace(/([A-Z])/g, ' $1').toLowerCase()
        })
      
      if (outcomes.length > 0) {
        summary += `: ${outcomes.join(', ')}`
      }
    }

    const historyEntry: HistoryData = {
      historyType: 'driver_contact',
      entityType: 'driver',
      entityId: driverId,
      timestamp: new Date().toISOString(),
      userId,
      summary,
      data: {
        contactDate: contactData.date,
        contactTime: contactData.time,
        phoneNumber: contactData.phoneNumber,
        callOutcome: contactData.outcome,
        originalNotes: contactData.notes
      },
      notes: contactData.notes
    }

    return this.create(historyEntry)
  }

  // Get history for a specific entity
  async getEntityHistory(
    entityType: string,
    entityId: string,
    historyType?: string,
    limit: number = 50
  ): Promise<History[]> {
    const query: any = {
      entityType,
      entityId,
      $sort: { timestamp: -1 },
      $limit: limit
    }

    if (historyType) {
      query.historyType = historyType
    }

    const result = await this.find({ query })
    return Array.isArray(result) ? result : result.data
  }

  // Get recent history across all entities
  async getRecentHistory(
    historyType?: string,
    limit: number = 100
  ): Promise<History[]> {
    const query: any = {
      $sort: { timestamp: -1 },
      $limit: limit
    }

    if (historyType) {
      query.historyType = historyType
    }

    const result = await this.find({ query })
    return Array.isArray(result) ? result : result.data
  }
}