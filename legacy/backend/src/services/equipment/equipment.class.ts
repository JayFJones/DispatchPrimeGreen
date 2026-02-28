// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Equipment, EquipmentData, EquipmentPatch, EquipmentQuery } from './equipment.schema'

export type { Equipment, EquipmentData, EquipmentPatch, EquipmentQuery }

export interface EquipmentParams extends MongoDBAdapterParams<EquipmentQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class EquipmentService<ServiceParams extends Params = EquipmentParams> extends MongoDBService<
  Equipment,
  EquipmentData,
  EquipmentParams,
  EquipmentPatch
> {
  constructor(options: MongoDBAdapterOptions) {
    super(options)
  }

  // Find equipment by number
  async findByEquipmentNumber(equipmentNumber: string): Promise<Equipment | null> {
    const result = await this.find({
      query: {
        equipmentNumber: equipmentNumber,
        $limit: 1
      }
    })
    
    const data = Array.isArray(result) ? result : result.data
    return data.length > 0 ? data[0] : null
  }

  // Create or update equipment
  async createOrUpdate(equipmentData: Partial<EquipmentData>): Promise<Equipment> {
    if (!equipmentData.equipmentNumber) {
      throw new Error('Equipment number is required')
    }

    const existing = await this.findByEquipmentNumber(equipmentData.equipmentNumber)
    
    if (existing) {
      // Update existing equipment
      return this.patch(existing._id.toString(), equipmentData as EquipmentPatch)
    } else {
      // Create new equipment with defaults
      const newEquipment: EquipmentData = {
        equipmentNumber: equipmentData.equipmentNumber,
        equipmentType: equipmentData.equipmentType || 'truck',
        status: equipmentData.status || 'active',
        equipmentStatus: equipmentData.equipmentStatus,
        truckType: equipmentData.truckType,
        make: equipmentData.make,
        model: equipmentData.model,
        year: equipmentData.year,
        vin: equipmentData.vin,
        licensePlate: equipmentData.licensePlate,
        registrationState: equipmentData.registrationState,
        registrationExpiry: equipmentData.registrationExpiry,
        insurancePolicy: equipmentData.insurancePolicy,
        insuranceExpiry: equipmentData.insuranceExpiry,
        lastMaintenanceDate: equipmentData.lastMaintenanceDate,
        nextMaintenanceDate: equipmentData.nextMaintenanceDate,
        mileage: equipmentData.mileage,
        fuelType: equipmentData.fuelType,
        capacity: equipmentData.capacity,
        notes: equipmentData.notes
      }
      
      return this.create(newEquipment)
    }
  }

  // Get active equipment by type
  async getActiveEquipmentByType(equipmentType: 'truck' | 'trailer' | 'sub-unit'): Promise<Equipment[]> {
    const result = await this.find({
      query: {
        equipmentType,
        status: 'active',
        $sort: { equipmentNumber: 1 }
      }
    })
    
    return Array.isArray(result) ? result : result.data
  }

  // Get equipment summary statistics
  async getEquipmentStats(): Promise<{
    totalTrucks: number
    totalSubUnits: number
    activeTrucks: number
    activeSubUnits: number
    dedicatedEquipment: number
    substituteEquipment: number
  }> {
    const allEquipment = await this.find({
      query: { $limit: 10000 }
    })
    const equipment = Array.isArray(allEquipment) ? allEquipment : allEquipment.data

    const stats = {
      totalTrucks: equipment.filter(e => e.equipmentType === 'truck').length,
      totalSubUnits: equipment.filter(e => e.equipmentType === 'sub-unit').length,
      activeTrucks: equipment.filter(e => e.equipmentType === 'truck' && e.status === 'active').length,
      activeSubUnits: equipment.filter(e => e.equipmentType === 'sub-unit' && e.status === 'active').length,
      dedicatedEquipment: equipment.filter(e => e.equipmentStatus === 'dedicated').length,
      substituteEquipment: equipment.filter(e => e.equipmentStatus === 'substitute').length
    }

    return stats
  }

  // Get equipment info for route display
  async getEquipmentInfo(equipmentNumbers: string[]): Promise<Map<string, Equipment>> {
    const equipmentMap = new Map<string, Equipment>()
    
    if (equipmentNumbers.length === 0) return equipmentMap
    
    const result = await this.find({
      query: {
        equipmentNumber: { $in: equipmentNumbers },
        $limit: equipmentNumbers.length
      }
    })
    
    const equipment = Array.isArray(result) ? result : result.data
    equipment.forEach(eq => {
      equipmentMap.set(eq.equipmentNumber, eq)
    })
    
    return equipmentMap
  }
}