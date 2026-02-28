// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Fleet, FleetData, FleetPatch, FleetQuery } from './fleet.schema'

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('fleet'))
  }
}

export type { Fleet, FleetData, FleetPatch, FleetQuery }

export interface FleetParams extends MongoDBAdapterParams<FleetQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class FleetService<ServiceParams extends Params = FleetParams> extends MongoDBService<
  Fleet,
  FleetData,
  FleetParams,
  FleetPatch
> {
  constructor(options: MongoDBAdapterOptions) {
    super(options)
  }

  // Find fleet vehicle by truck ID
  async findByTruckID(truckID: string): Promise<Fleet | null> {
    const result = await this.find({
      query: {
        truckID: truckID,
        $limit: 1
      }
    })
    
    const data = Array.isArray(result) ? result : result.data
    return data.length > 0 ? data[0] : null
  }

  // Update location and odometer for a truck
  async updateLocation(truckID: string, latitude: number, longitude: number, odometer?: number): Promise<Fleet> {
    const existing = await this.findByTruckID(truckID)
    
    if (!existing) {
      throw new Error(`Truck ${truckID} not found in fleet`)
    }

    const updateData: Partial<FleetPatch> = {
      lastLocationLatitude: latitude,
      lastLocationLongitude: longitude,
      lastLocationUpdated: new Date().toISOString()
    }

    if (odometer !== undefined) {
      updateData.odometer = odometer
    }

    return this.patch(existing._id.toString(), updateData)
  }

  // Get fleet statistics
  async getFleetStats(): Promise<{
    totalVehicles: number
    activeVehicles: number
    straightTrucks: number
    tractorTrailers: number
    inMaintenance: number
    outOfService: number
  }> {
    const allVehicles = await this.find({
      query: { $limit: 10000 }
    })
    const vehicles = Array.isArray(allVehicles) ? allVehicles : allVehicles.data

    const stats = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.status === 'active').length,
      straightTrucks: vehicles.filter(v => v.vehicleType === 'ST').length,
      tractorTrailers: vehicles.filter(v => v.vehicleType === 'TT').length,
      inMaintenance: vehicles.filter(v => v.status === 'maintenance').length,
      outOfService: vehicles.filter(v => v.status === 'out-of-service').length
    }

    return stats
  }

  // Get vehicles by type
  async getVehiclesByType(vehicleType: 'ST' | 'TT'): Promise<Fleet[]> {
    const result = await this.find({
      query: {
        vehicleType,
        $sort: { truckID: 1 }
      }
    })
    
    return Array.isArray(result) ? result : result.data
  }

  // Get active vehicles
  async getActiveVehicles(): Promise<Fleet[]> {
    const result = await this.find({
      query: {
        status: 'active',
        $sort: { truckID: 1 }
      }
    })
    
    return Array.isArray(result) ? result : result.data
  }

  // Get vehicles by terminal
  async getVehiclesByTerminal(terminalId: string): Promise<Fleet[]> {
    const result = await this.find({
      query: {
        terminalId,
        $sort: { truckID: 1 }
      }
    })
    
    return Array.isArray(result) ? result : result.data
  }

  // Create or update fleet vehicle by truck ID
  async createOrUpdateByTruckID(fleetData: Partial<FleetData>): Promise<Fleet> {
    if (!fleetData.truckID) {
      throw new Error('Truck ID is required')
    }

    const existing = await this.findByTruckID(fleetData.truckID)
    
    if (existing) {
      // Update existing vehicle
      return this.patch(existing._id.toString(), fleetData)
    } else {
      // Create new vehicle with defaults
      const newVehicle: FleetData = {
        truckID: fleetData.truckID,
        terminalId: fleetData.terminalId,
        vehicleType: fleetData.vehicleType || 'ST',
        status: fleetData.status || 'active',
        vin: fleetData.vin,
        odometer: fleetData.odometer,
        lastLocationLatitude: fleetData.lastLocationLatitude,
        lastLocationLongitude: fleetData.lastLocationLongitude,
        lastLocationUpdated: fleetData.lastLocationUpdated,
        notes: fleetData.notes
      }
      
      return this.create(newVehicle)
    }
  }
}