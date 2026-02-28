import type { Params } from '@feathersjs/feathers'
import type { Application } from '../../declarations'
import type { AdminAction, AdminResponse } from './admin.schema'
import { UserRole } from '../users/users.schema'
import * as XLSX from 'xlsx'

export interface AdminParams extends Params {}

export class AdminService {
  constructor(public app: Application) {}

  async create(data: AdminAction, params?: AdminParams): Promise<AdminResponse> {
    const { action } = data

    // Only allow admin users to perform admin actions
    if (!params?.user || !params.user.roles?.includes(UserRole.ADMIN)) {
      throw new Error('Admin privileges required')
    }

    switch (action) {
      case 'clear-databases':
        return await this.clearDatabases()
      case 'export-endpoints':
        return await this.exportEndpoints()
      default:
        throw new Error(`Unknown admin action: ${action}`)
    }
  }

  private async clearDatabases(): Promise<AdminResponse> {
    try {
      const collectionsToDelete = [
        'terminals', 
        'customers', 
        'routes', 
        'route-stops',
        'drivers',
        'equipment', 
        'history',
        'dispatched-routes',
        'route-substitutions',
        'fleet',
        'fleet-status',
        'route-executions'
      ]

      let collectionsDropped = 0
      const results: string[] = []

      // Get MongoDB database from FeathersJS app
      const mongoDbPromise = this.app.get('mongodbClient')
      if (!mongoDbPromise) {
        throw new Error('MongoDB client not available')
      }

      // Await the database connection (it's a Promise<Db>)
      const db = await mongoDbPromise

      for (const collectionName of collectionsToDelete) {
        try {
          // Check if collection exists first
          const collections = await db.listCollections({ name: collectionName }).toArray()

          if (collections.length > 0) {
            // Get record count before dropping
            const collection = db.collection(collectionName)
            const recordCount = await collection.countDocuments()

            // Drop the entire collection
            await collection.drop()

            collectionsDropped++
            results.push(`${collectionName}: dropped (${recordCount} records)`)
          } else {
            results.push(`${collectionName}: collection does not exist`)
          }
        } catch (error: any) {
          // Handle "ns not found" error (collection doesn't exist)
          if (error.code === 26 || error.message.includes('ns not found')) {
            results.push(`${collectionName}: collection does not exist`)
          } else {
            console.error(`Error dropping collection ${collectionName}:`, error)
            results.push(`${collectionName}: Error - ${error.message}`)
          }
        }
      }

      return {
        success: true,
        message: `Successfully dropped ${collectionsDropped} collections: ${results.join(', ')}`,
        data: {
          collectionsDropped,
          details: results
        }
      }
    } catch (error: any) {
      console.error('Error in clearDatabases:', error)
      return {
        success: false,
        message: `Failed to clear databases: ${error.message}`,
        data: { error: error.message }
      }
    }
  }

  private async exportEndpoints(): Promise<AdminResponse> {
    try {
      // Server-side calls can use paginate: false to get all records
      const terminalsService = this.app.service('terminals')
      const customersService = this.app.service('customers')
      const routesService = this.app.service('routes')
      const routeStopsService = this.app.service('route-stops')

      // Helper function to get all records using FeathersJS querying with $limit and $skip
      const getAllRecords = async (service: any) => {
        // First get the total count using $limit: 0 (FeathersJS documented approach)
        const countResult = await service.find({
          query: {
            $limit: 0
          }
        })

        const total = countResult.total

        if (total === 0) return []

        const allRecords: any[] = []
        const limit = 2000 // Use the max allowed limit
        let skip = 0

        while (skip < total) {
          const result = await service.find({
            query: {
              $limit: limit,
              $skip: skip
            }
          })

          allRecords.push(...result.data)

          // If we got fewer records than expected, we've reached the end
          if (result.data.length < limit) {
            break
          }

          skip += limit
        }

        return allRecords
      }

      // Get all records using proper FeathersJS pagination
      const terminals = await getAllRecords(terminalsService)
      const customers = await getAllRecords(customersService)
      const routes = await getAllRecords(routesService)
      const routeStops = await getAllRecords(routeStopsService)

      // Create lookup maps for efficient data joining
      const terminalMap = new Map()
      terminals.forEach((terminal: any) => {
        terminalMap.set(terminal._id.toString(), terminal)
      })

      const customerMap = new Map()
      customers.forEach((customer: any) => {
        customerMap.set(customer._id.toString(), customer)
      })

      const routeMap = new Map()
      routes.forEach((route: any) => {
        routeMap.set(route._id.toString(), route)
      })

      // Reconstruct the original Excel format by joining the data
      const exportData: any[] = []

      routeStops.forEach((stop: any) => {
        const route = routeMap.get(stop.routeId?.toString())
        const terminal = route ? terminalMap.get(route.terminalId?.toString()) : null

        // Helper function to convert standardized HH:MM time to Excel time number
        const convertTimeToExcelNumber = (timeStr: string): number | string => {
          if (!timeStr || timeStr.trim() === '') return ''

          try {
            const cleanTime = timeStr.trim()

            // Check if it's already in HH:MM format (our standard storage format)
            const timeParts = cleanTime.split(':')
            if (timeParts.length === 2) {
              const hours = parseInt(timeParts[0], 10)
              const minutes = parseInt(timeParts[1], 10)

              if (
                !isNaN(hours) &&
                !isNaN(minutes) &&
                hours >= 0 &&
                hours <= 23 &&
                minutes >= 0 &&
                minutes <= 59
              ) {
                // Convert to Excel time number (fraction of a day)
                return (hours + minutes / 60) / 24
              }
            }
          } catch (error) {}

          // Return original string if parsing fails
          return timeStr
        }

        // Reconstruct the original row format using route-stop as source of truth
        const row = {
          TRKID: route?.trkid || '',
          AGENT: terminal ? (terminal.dcp ? `${terminal.dcp}-${terminal.name}` : terminal.name) : '',
          CID: stop.cid || '',
          CUSTNAME: stop.custName || '',
          Address: stop.address || '',
          CITY: stop.city || '',
          ST: stop.state || '',
          ZIP: stop.zipCode || '',
          'Time Zone': stop.timeZone || '',
          ETA: convertTimeToExcelNumber(stop.eta || ''),
          ETD: convertTimeToExcelNumber(stop.etd || ''),
          CommitTime: convertTimeToExcelNumber(stop.commitTime || ''),
          FTime: stop.fixedTime || '',
          Cube: stop.cube || '',
          OpenTime: convertTimeToExcelNumber(stop.openTime || ''),
          CloseTime: convertTimeToExcelNumber(stop.closeTime || ''),
          HUB: terminal?.fullName || '',
          Lanter_ID: stop.lanterID || '',
          Customer_PDC: stop.customerPDC || '',
          LATITUDE: stop.latitude || '',
          LONGITUDE: stop.longitude || '',
          GEORESULT: stop.geoResult || '',
          LegNumber: route?.legNumber || '',
          Seq: stop.sequence || ''
        }

        exportData.push(row)
      })

      // Sort by TRKID and sequence for consistent ordering
      exportData.sort((a, b) => {
        if (a.TRKID !== b.TRKID) {
          return a.TRKID.localeCompare(b.TRKID)
        }
        return (a.Seq || 0) - (b.Seq || 0)
      })

      // Create Excel workbook
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportData)

      // Apply time formatting to time columns
      const timeColumns = ['ETA', 'ETD', 'CommitTime', 'OpenTime', 'CloseTime']
      const timeFormat = 'h:mm AM/PM' // Excel format for time with AM/PM

      // Find the column indices for time fields
      const headers = Object.keys(exportData[0] || {})
      const timeColumnIndices: number[] = []

      timeColumns.forEach(timeCol => {
        const colIndex = headers.indexOf(timeCol)
        if (colIndex !== -1) {
          timeColumnIndices.push(colIndex)
        }
      })

      // Apply formatting to time columns for all data rows
      if (worksheet['!cols']) {
        // Extend existing column definitions
      } else {
        worksheet['!cols'] = []
      }

      // Set format for time columns
      timeColumnIndices.forEach(colIndex => {
        const colLetter = XLSX.utils.encode_col(colIndex)

        // Apply format to all rows in this column
        for (let rowIndex = 1; rowIndex <= exportData.length; rowIndex++) {
          const cellAddress = colLetter + (rowIndex + 1) // +1 because row 1 is header
          const cell = worksheet[cellAddress]

          if (cell && typeof cell.v === 'number' && cell.v !== '') {
            cell.z = timeFormat // Set number format
            cell.t = 'n' // Ensure it's treated as a number
          }
        }
      })

      XLSX.utils.book_append_sheet(workbook, worksheet, 'EndPoints')

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      // Convert buffer to base64 for JSON response
      const base64Data = buffer.toString('base64')

      return {
        success: true,
        message: `Successfully exported ${exportData.length} endpoint records`,
        data: {
          filename: 'EndPoints_Export.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          data: base64Data,
          recordCount: exportData.length
        }
      }
    } catch (error: any) {
      console.error('Error in exportEndpoints:', error)
      return {
        success: false,
        message: `Failed to export endpoints: ${error.message}`,
        data: { error: error.message }
      }
    }
  }
}

export const getOptions = (app: Application) => {
  return app
}
