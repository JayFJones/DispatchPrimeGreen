// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Availability, AvailabilityData, AvailabilityPatch, AvailabilityQuery } from './availability.schema'

export type { Availability, AvailabilityData, AvailabilityPatch, AvailabilityQuery }

export interface AvailabilityParams extends MongoDBAdapterParams<AvailabilityQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class AvailabilityService<ServiceParams extends Params = AvailabilityParams> extends MongoDBService<
  Availability,
  AvailabilityData,
  AvailabilityParams,
  AvailabilityPatch
> {
  constructor(options: MongoDBAdapterOptions) {
    super(options)
  }

  // Get availability records for a specific driver
  async getDriverAvailability(
    driverId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Availability[]> {
    const query: any = {
      driverId,
      $sort: { startDate: -1 },
      $limit: 1000
    }

    // Add date filtering if provided
    if (startDate || endDate) {
      query.$or = []
      
      if (startDate && endDate) {
        // Records that overlap with the requested range
        query.$or = [
          // Records that start within our range
          { startDate: { $gte: startDate, $lte: endDate } },
          // Records that end within our range
          { endDate: { $gte: startDate, $lte: endDate } },
          // Records that span our entire range
          { startDate: { $lte: startDate }, $or: [
            { endDate: { $gte: endDate } },
            { endDate: { $exists: false } } // Ongoing records
          ]},
        ]
      } else if (startDate) {
        // Records that are active on or after startDate
        query.$or = [
          { startDate: { $gte: startDate } },
          { $and: [
            { startDate: { $lte: startDate } },
            { $or: [
              { endDate: { $gte: startDate } },
              { endDate: { $exists: false } }
            ]}
          ]}
        ]
      } else if (endDate) {
        // Records that are active on or before endDate
        query.startDate = { $lte: endDate }
      }
    }

    const result = await this.find({ query })
    return Array.isArray(result) ? result : result.data
  }

  // Check if driver is available on a specific date
  async isDriverAvailable(driverId: string, date: string): Promise<boolean> {
    const query = {
      driverId,
      startDate: { $lte: date },
      $or: [
        { endDate: { $gte: date } },
        { endDate: { $exists: false } } // Ongoing availability
      ]
    }

    const result = await this.find({ query })
    const records = Array.isArray(result) ? result : result.data

    // If no availability records, assume available
    if (records.length === 0) {
      return true
    }

    // Check if any record indicates unavailability
    return !records.some(record => 
      record.availabilityType !== 'Available'
    )
  }

  // Get drivers who are unavailable on a specific date
  async getUnavailableDriversForDate(date: string): Promise<string[]> {
    const query: any = {
      startDate: { $lte: date },
      $or: [
        { endDate: { $gte: date } },
        { endDate: { $exists: false } } // Ongoing availability
      ],
      availabilityType: { $nin: ['Available'] }
    }

    const result = await this.find({ query })
    const records = Array.isArray(result) ? result : result.data

    // Return unique driver IDs
    return [...new Set(records.map((record: any) => record.driverId))]
  }

  // Create or update availability for a driver
  async setDriverAvailability(
    driverId: string,
    availabilityData: {
      startDate: string
      endDate?: string
      availabilityType: 'Available' | 'Not Available' | 'PTO' | 'Vacation' | 'Sick' | 'Personal'
      reason?: string
      notes?: string
      userId?: string
    }
  ): Promise<Availability> {
    // Remove any existing overlapping records first
    await this.removeOverlappingAvailability(driverId, availabilityData.startDate, availabilityData.endDate)

    // Create new availability record
    const newAvailability: AvailabilityData = {
      driverId,
      startDate: availabilityData.startDate,
      endDate: availabilityData.endDate,
      availabilityType: availabilityData.availabilityType,
      reason: availabilityData.reason,
      notes: availabilityData.notes,
      userId: availabilityData.userId
    }

    return this.create(newAvailability)
  }

  // Helper method to remove overlapping availability records
  private async removeOverlappingAvailability(
    driverId: string,
    startDate: string,
    endDate?: string
  ): Promise<void> {
    const query: any = {
      driverId,
      $or: []
    }

    if (endDate) {
      // Remove records that overlap with the new date range
      query.$or = [
        // Records that start within our range
        { startDate: { $gte: startDate, $lte: endDate } },
        // Records that end within our range  
        { endDate: { $gte: startDate, $lte: endDate } },
        // Records that span our entire range
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
        // Ongoing records that start before our range
        { startDate: { $lte: startDate }, endDate: { $exists: false } }
      ]
    } else {
      // New record is ongoing, remove all future records
      query.$or = [
        { startDate: { $gte: startDate } },
        { startDate: { $lte: startDate }, $or: [
          { endDate: { $gte: startDate } },
          { endDate: { $exists: false } }
        ]}
      ]
    }

    const overlapping = await this.find({ query })
    const records = Array.isArray(overlapping) ? overlapping : overlapping.data

    for (const record of records) {
      await this.remove(record._id)
    }
  }
}