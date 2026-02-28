// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { FleetStatus, FleetStatusData, FleetStatusPatch, FleetStatusQuery } from './fleet-status.schema'

export type { FleetStatus, FleetStatusData, FleetStatusPatch, FleetStatusQuery }

export interface FleetStatusParams extends MongoDBAdapterParams<FleetStatusQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class FleetStatusService<ServiceParams extends Params = FleetStatusParams> extends MongoDBService<
  FleetStatus,
  FleetStatusData,
  FleetStatusParams,
  FleetStatusPatch
> {
  private app: Application

  constructor(options: any, app: Application) {
    super(options)
    this.app = app
  }
  async bulkCreateFleetSnapshots(fleetData: any[]): Promise<FleetStatus[]> {
    console.log(`[FLEET-STATUS] bulkCreateFleetSnapshots called with ${fleetData.length} records`)
    const timestamp = new Date().toISOString()
    
    const fleetStatusRecords = fleetData.map(item => {
      const record: any = {
        deviceId: item.deviceId,
        deviceName: item.deviceName || 'Unknown Device',
        latitude: item.latitude,
        longitude: item.longitude,
        speed: item.speed,
        bearing: item.bearing,
        isDriving: Boolean(item.isDriving),
        responseTimestamp: item.responseTimestamp,
        recordedAt: timestamp
        // createdAt and updatedAt will be added by the resolver automatically
      }

      // Only include driverId if it's a valid string
      if (item.driverId && typeof item.driverId === 'string') {
        record.driverId = item.driverId
      }

      // Only include driverInfo if it exists and has valid data, filtering to allowed properties
      if (item.driverInfo && typeof item.driverInfo === 'object') {
        const filteredDriverInfo: any = {}
        
        // Only include properties that are allowed by the schema
        if (item.driverInfo.id) filteredDriverInfo.id = item.driverInfo.id
        if (item.driverInfo.name) filteredDriverInfo.name = item.driverInfo.name
        if (item.driverInfo.firstName) filteredDriverInfo.firstName = item.driverInfo.firstName
        if (item.driverInfo.lastName) filteredDriverInfo.lastName = item.driverInfo.lastName
        if (item.driverInfo.employeeNo) filteredDriverInfo.employeeNo = item.driverInfo.employeeNo
        
        // Only add driverInfo if it has at least one valid property
        if (Object.keys(filteredDriverInfo).length > 0) {
          record.driverInfo = filteredDriverInfo
        }
      }

      return record
    })

    // Use create method for each record (FeathersJS approach)
    const results: FleetStatus[] = []
    console.log(`[FLEET-STATUS] Creating ${fleetStatusRecords.length} individual records...`)
    
    for (const record of fleetStatusRecords) {
      try {
        const created = await this.create(record)
        results.push(created)
      } catch (error) {
        console.error('[FLEET-STATUS] Error creating fleet status record:', error)
        console.error('[FLEET-STATUS] Failed record:', JSON.stringify(record, null, 2))
      }
    }
    
    console.log(`[FLEET-STATUS] Successfully created ${results.length} records in MongoDB`)
    return results
  }

  async getLatestFleetStatus(): Promise<FleetStatus[]> {
    // Get records sorted by most recent first
    const result = await this.find({
      query: {
        $sort: { recordedAt: -1 },
        $limit: 1000
      }
    })
    
    const records = Array.isArray(result) ? result : result.data || []
    
    if (records.length === 0) {
      return []
    }

    // Get the most recent timestamp and filter records
    const latestTimestamp = records[0].recordedAt
    return records.filter(record => record.recordedAt === latestTimestamp)
  }

  async getFleetStatusHistory(deviceId: string, hours: number = 24): Promise<FleetStatus[]> {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - hours)

    const result = await this.find({
      query: {
        deviceId: deviceId,
        recordedAt: { $gte: cutoffTime.toISOString() },
        $sort: { recordedAt: -1 },
        $limit: 1000
      }
    })
    
    return Array.isArray(result) ? result : result.data || []
  }

  async getFleetStatusByTimeRange(startTime: string, endTime: string): Promise<FleetStatus[]> {
    const result = await this.find({
      query: {
        recordedAt: { 
          $gte: startTime,
          $lte: endTime
        },
        $sort: { recordedAt: -1, deviceName: 1 },
        $limit: 5000
      }
    })
    
    return Array.isArray(result) ? result : result.data || []
  }

  async getAvailableSnapshots(): Promise<{ recordedAt: string, count: number }[]> {
    console.log('[FLEET-STATUS] getAvailableSnapshots called')
    
    try {
      // Get ALL records without pagination to ensure we see everything
      const result = await this.find({
        query: {
          $sort: { recordedAt: -1 },
          $limit: 10000  // Increased limit to catch all records
        },
        paginate: false  // Disable pagination to get all records
      })
      
      const records = Array.isArray(result) ? result : (result as any).data || []
      console.log(`[FLEET-STATUS] Found ${records.length} total records`)
      
      if (records.length > 0) {
        console.log('[FLEET-STATUS] First 3 records:', records.slice(0, 3).map((r: any) => ({
          recordedAt: r.recordedAt,
          deviceName: r.deviceName,
          createdAt: r.createdAt
        })))
        console.log('[FLEET-STATUS] Last 3 records:', records.slice(-3).map((r: any) => ({
          recordedAt: r.recordedAt,
          deviceName: r.deviceName,
          createdAt: r.createdAt
        })))
      }
      
      // Group by recordedAt timestamp
      const snapshots = new Map<string, number>()
      records.forEach((record: any) => {
        const timestamp = record.recordedAt
        if (timestamp) {
          snapshots.set(timestamp, (snapshots.get(timestamp) || 0) + 1)
        }
      })
      
      console.log(`[FLEET-STATUS] Found ${snapshots.size} unique snapshots:`)
      snapshots.forEach((count, timestamp) => {
        console.log(`[FLEET-STATUS]   ${timestamp}: ${count} records`)
      })
      
      // Convert to array and sort by timestamp (newest first)
      const result_snapshots = Array.from(snapshots.entries())
        .map(([recordedAt, count]) => ({ recordedAt, count }))
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      
      console.log('[FLEET-STATUS] Returning snapshots:', result_snapshots.length, 'snapshots')
      return result_snapshots
    } catch (error) {
      console.error('[FLEET-STATUS] Error in getAvailableSnapshots:', error)
      return []
    }
  }

  async getFleetStatusBySnapshot(recordedAt: string): Promise<FleetStatus[]> {
    const result = await this.find({
      query: {
        recordedAt: recordedAt,
        $sort: { deviceName: 1 },
        $limit: 1000
      }
    })
    
    return Array.isArray(result) ? result : result.data || []
  }

  async getFleetStatusNearLocation(data: { lat: number, lng: number, radiusMiles?: number }, params?: any): Promise<FleetStatus[]> {
    console.log(`[FLEET-STATUS] getFleetStatusNearLocation called with data:`, data)
    console.log(`[FLEET-STATUS] params:`, params)
    
    const { lat, lng, radiusMiles = 1 } = data
    
    // Ensure lat and lng are numbers
    const latitude = typeof lat === 'number' ? lat : parseFloat(lat as any)
    const longitude = typeof lng === 'number' ? lng : parseFloat(lng as any)
    
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error(`[FLEET-STATUS] Invalid coordinates: lat=${lat}, lng=${lng}`)
      return []
    }
    
    console.log(`[FLEET-STATUS] Using coordinates: ${latitude}, ${longitude}`)
    
    try {
      // Helper function to calculate distance between two coordinates using Haversine formula
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3959 // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
      }

      // Get recent records first and process progressively
      const nearbyRecords: any[] = []
      let skip = 0
      const limit = 1000
      let hasMore = true
      let processedCount = 0
      
      // Limit search to recent records (last 30 days) for performance
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      while (hasMore && processedCount < 10000) { // Limit total processing to 10k records
        console.log(`[FLEET-STATUS] Fetching batch ${skip} to ${skip + limit}`)
        
        const result = await this.find({
          query: {
            recordedAt: { $gte: thirtyDaysAgo.toISOString() },
            $sort: { recordedAt: -1 },
            $limit: limit,
            $skip: skip
          },
          paginate: false
        })
        
        const batch = Array.isArray(result) ? result : (result as any).data || []
        
        if (batch.length === 0) {
          hasMore = false
          break
        }
        
        // Filter and process this batch
        for (const record of batch) {
          processedCount++
          
          // Skip records without driver info
          if (!record.driverInfo || 
              !record.driverInfo.name && !record.driverInfo.firstName && !record.driverInfo.lastName) {
            continue
          }
          
          // Skip records without valid coordinates
          if (!record.latitude || !record.longitude) {
            continue
          }
          
          // Calculate distance
          const distance = calculateDistance(latitude, longitude, record.latitude, record.longitude)
          if (distance <= radiusMiles) {
            nearbyRecords.push(record)
          }
        }
        
        skip += limit
        
        // If we got fewer records than the limit, we've reached the end
        if (batch.length < limit) {
          hasMore = false
        }
      }
      
      // Sort by most recent first
      const sortedRecords = nearbyRecords.sort((a: any, b: any) => {
        return new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      })
      
      console.log(`[FLEET-STATUS] Processed ${processedCount} records, found ${sortedRecords.length} within ${radiusMiles} miles`)
      return sortedRecords
    } catch (error: any) {
      console.error('[FLEET-STATUS] Error in getFleetStatusNearLocation:', error)
      return []
    }
  }

  async getTripData(data: { fromDate?: string, authData?: any }, params?: any): Promise<{ trips: any[], version?: string, fromCache: boolean }> {
    console.log(`[FLEET-STATUS] getTripData called - delegating to geotab service`)
    
    // Delegate to geotab service
    const geotabService = this.app.service('geotab')
    
    if (!geotabService) {
      throw new Error('Geotab service not available')
    }
    
    return await geotabService.getTripData(data, params)
  }

  async clearTripCache(): Promise<{ success: boolean }> {
    console.log(`[FLEET-STATUS] clearTripCache called - delegating to geotab service`)
    
    // Delegate to geotab service
    const geotabService = this.app.service('geotab')
    
    if (!geotabService) {
      throw new Error('Geotab service not available')
    }
    
    return await geotabService.clearTripCache()
  }

}

export const getOptions = (app: Application): MongoDBAdapterOptions => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then((db: any) => db.collection('fleet-status'))
  }
}