import type { Params, ServiceInterface } from '@feathersjs/feathers'
import type { Application } from '../../declarations'
import type { ImportProcess, ImportProcessData } from './import-process.schema'
import * as XLSX from 'xlsx'
import { UserRole } from '../users/users.schema'
import { Forbidden } from '@feathersjs/errors'
import { ImportPreviewService } from './import-preview.class'
import { ObjectId } from 'mongodb'

export type { ImportProcess, ImportProcessData }

export interface ImportProcessParams extends Params {
  file?: Express.Multer.File
  fileName?: string
  importType?: string
}

export class ImportProcessService
  implements ServiceInterface<ImportProcess, ImportProcessData, ImportProcessParams>
{
  constructor(public app: Application) {}

  // Helper function to generate URL-compliant terminal names
  private generateCompliantName(terminalName: string): string {
    if (!terminalName) return ''
    
    // Convert to URL-safe format: remove special chars, replace spaces with hyphens, uppercase
    return terminalName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .toUpperCase() // Convert to uppercase
  }

  // Helper function to parse city and state from "City, State" format
  private parseCityState(cityStateText: string): { city: string; state: string } {
    if (!cityStateText) return { city: '', state: '' }
    
    const parts = cityStateText.split(',').map(part => part.trim())
    if (parts.length >= 2) {
      return {
        city: parts[0],
        state: parts[1]
      }
    }
    
    // If no comma found, assume entire text is city
    return {
      city: cityStateText.trim(),
      state: ''
    }
  }

  async create(data: ImportProcessData, params?: ImportProcessParams): Promise<ImportProcess> {
    // Get file from multer middleware
    const file = params?.file
    const fileName = params?.fileName || data.fileName
    const importType = params?.importType || data.importType

    // Check admin permissions
    if (!params?.user || !params.user.roles?.includes(UserRole.ADMIN)) {
      throw new Forbidden('Admin access required')
    }

    try {
      // Use file buffer from multer instead of base64 decoding
      if (!file || !file.buffer) {
        throw new Error('No file provided or file buffer is empty')
      }

      const buffer = file.buffer

      // Validate file type by extension - now all imports use Excel format
      const fileNameLower = fileName.toLowerCase()
      if (!fileNameLower.endsWith('.xlsx') && !fileNameLower.endsWith('.xls')) {
        throw new Error('File must be an Excel spreadsheet (.xlsx or .xls)')
      }

      if (importType === 'terminal-routes') {
        return await this.processTerminalRouteImport(buffer)
      } else if (importType === 'lanter-endpoints') {
        return await this.processLanterEndpointsImport(buffer)
      } else if (importType === 'driver-board') {
        return await this.processDriverBoardImport(buffer)
      } else {
        throw new Error(`Unsupported import type: ${importType}`)
      }
    } catch (error: any) {
      return {
        _id: new Date().getTime().toString(),
        success: false,
        message: error.message || 'Import failed',
        summary: {
          terminalsProcessed: 0,
          customersProcessed: 0,
          routesProcessed: 0,
          routeStopsProcessed: 0,
          totalRows: 0
        },
        warnings: [{ row: 0, message: error.message || 'Import process failed', data: 'System error' }],
        createdAt: new Date().toISOString()
      }
    }
  }

  private async processTerminalRouteImport(_buffer: Buffer): Promise<ImportProcess> {
    throw new Error(
      'Terminal route import has been removed. Please implement a new import method for your data.'
    )
  }

  private async processLanterEndpointsImport(buffer: Buffer): Promise<ImportProcess> {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file')
    }

    const warnings: Array<{ row: number; message: string; data: string }> = []
    let routesData: any[] = []
    let terminalsUpdates: any[] = []
    let driversData: any[] = []

    // Check for Routes sheet
    const routesSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'routes')

    if (routesSheetName) {
      const routesResult = this.parseRoutesSheetForImport(workbook.Sheets[routesSheetName])
      routesData = routesResult.data
      warnings.push(...routesResult.warnings.map(w => ({ row: 0, message: w, data: 'Routes sheet' })))
    } else {
      warnings.push({
        row: 0,
        message: 'Routes sheet not found - no route data will be imported',
        data: 'Sheet detection'
      })
    }

    // Check for Terminals sheet (previously called Hubs)
    const terminalsSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'terminals')

    if (terminalsSheetName) {
      const terminalsResult = this.parseTerminalsSheetForImport(workbook.Sheets[terminalsSheetName])
      terminalsUpdates = terminalsResult.data
      warnings.push(...terminalsResult.warnings.map(w => ({ row: 0, message: w, data: 'Terminals sheet' })))
    } else {
      warnings.push({
        row: 0,
        message: 'Terminals sheet not found - no terminal updates will be applied',
        data: 'Sheet detection'
      })
    }

    // Check for ADL sheet (driver data)
    const adlSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'adl')

    if (adlSheetName) {
      const driversResult = this.parseDriversSheetForImport(workbook.Sheets[adlSheetName])
      driversData = driversResult.data
      warnings.push(...driversResult.warnings.map(w => ({ row: 0, message: w, data: 'ADL sheet' })))
    } else {
      warnings.push({
        row: 0,
        message: 'ADL sheet not found - no driver data will be imported',
        data: 'Sheet detection'
      })
    }

    // Process the import using the parsed multi-sheet data
    return this.processMultiSheetImport(routesData, terminalsUpdates, driversData, warnings)
  }

  private parseRoutesSheetForImport(worksheet: XLSX.WorkSheet): { data: any[]; warnings: string[] } {
    // Reuse the existing logic from import-preview service but return warnings as strings
    const importPreviewService = new ImportPreviewService(this.app)
    const routesResult = (importPreviewService as any).parseRoutesSheet(worksheet)

    return {
      data: routesResult.data,
      warnings: routesResult.warnings
    }
  }

  private parseTerminalsSheetForImport(worksheet: XLSX.WorkSheet): { data: any[]; warnings: string[] } {
    // Reuse the existing logic from import-preview service
    const importPreviewService = new ImportPreviewService(this.app)
    const terminalsResult = (importPreviewService as any).parseTerminalsSheet(worksheet)

    return {
      data: terminalsResult.data,
      warnings: terminalsResult.warnings
    }
  }

  private parseDriversSheetForImport(worksheet: XLSX.WorkSheet): { data: any[]; warnings: string[] } {
    // Reuse the existing logic from import-preview service
    const importPreviewService = new ImportPreviewService(this.app)
    const driversResult = (importPreviewService as any).parseDriversSheet(worksheet)

    return {
      data: driversResult.data,
      warnings: driversResult.warnings
    }
  }

  private async processMultiSheetImport(
    routesData: any[],
    terminalsUpdates: any[],
    driversData: any[],
    initialWarnings: Array<{ row: number; message: string; data: string }>
  ): Promise<ImportProcess> {
    const warnings = [...initialWarnings]

    // Convert routes data to the format expected by the original processing logic
    const processedRoutes = this.convertRoutesDataToLegacyFormat(routesData)

    // Step 1: Process routes using existing logic
    const routeResult = await this.processRoutesFromData(processedRoutes, warnings)

    // Step 2: Apply terminal updates if any
    let terminalsUpdated = 0
    if (terminalsUpdates.length > 0) {
      terminalsUpdated = await this.applyTerminalUpdates(terminalsUpdates, warnings)
    }

    // Step 2.5: Fill in missing city/state by parsing terminal names as fallback
    const additionalUpdates = await this.fillMissingCityState(warnings)
    terminalsUpdated += additionalUpdates

    // Step 3: Process drivers if any
    let driversProcessed = 0
    if (driversData.length > 0) {
      driversProcessed = await this.processDriversData(driversData, warnings)
    }

    return {
      _id: new Date().getTime().toString(),
      success: true,
      message: `Multi-sheet import completed successfully! Processed ${routeResult.terminalsProcessed} terminals, ${routeResult.customersProcessed} customers, ${routeResult.routesProcessed} routes, ${routeResult.routeStopsProcessed} route stops, updated ${terminalsUpdated} terminals from Terminals sheet, and imported ${driversProcessed} drivers.`,
      summary: {
        terminalsProcessed: routeResult.terminalsProcessed,
        customersProcessed: routeResult.customersProcessed,
        routesProcessed: routeResult.routesProcessed,
        routeStopsProcessed: routeResult.routeStopsProcessed,
        terminalsUpdated,
        driversProcessed,
        totalRows: routesData.length
      },
      warnings,
      createdAt: new Date().toISOString()
    }
  }

  private convertRoutesDataToLegacyFormat(routesData: any[]): any[] {
    // Routes data is already in the correct format from the parseRoutesSheet method
    // No conversion needed as it matches the expected structure from the original processLanterEndpointsImport
    return routesData
  }

  private async processRoutesFromData(
    routesData: any[],
    warnings: Array<{ row: number; message: string; data: string }>
  ): Promise<{
    terminalsProcessed: number
    customersProcessed: number
    routesProcessed: number
    routeStopsProcessed: number
  }> {
    // Parse and organize data (reusing core logic from original processLanterEndpointsImport)
    const terminalsMap = new Map<string, any>()
    const customersMap = new Map<string, any>()
    const routesMap = new Map<string, any>()
    const routeStops: any[] = []


    for (let i = 0; i < routesData.length; i++) {
      // Show progress every 200 rows for large datasets
      if (i > 0 && i % 200 === 0) {
      }
      const data = routesData[i]

      try {
        const trkid = data.trkid?.toString().trim() || ''
        const agent = data.agent?.toString().trim() || ''
        const cid = data.cid?.toString().trim() || ''
        const custname = data.custname?.toString().trim() || ''

        // Extract terminal info using HUB as terminal name and extract DCP from agent
        const hub = data.hub?.toString().trim() || ''
        const terminalName = hub // Use HUB column as terminal name (required)
        const terminalKey = hub // Use HUB value as unique key for terminal creation
        
        // Extract DCP from agent (part before hyphen)
        let dcp = ''
        const firstHyphenIndex = agent.indexOf('-')
        if (firstHyphenIndex !== -1) {
          dcp = agent.substring(0, firstHyphenIndex) // DCP is part before hyphen
        }

        if (terminalName && agent && !terminalsMap.has(terminalKey)) {
          terminalsMap.set(terminalKey, {
            name: terminalName, // Terminal name from HUB column
            agent: agent, // Store full agent
            dcp: dcp, // DCP extracted from agent (part before hyphen)
            cName: this.generateCompliantName(terminalName), // URL-compliant name
            city: '', // Will be populated by Terminals sheet
            state: '', // Will be populated by Terminals sheet
            terminalType: 'hub' // Default type - will be updated by Terminals sheet if has group
          })
        } else if (agent && !terminalName) {
          // Add warning when agent is present but HUB column is missing
          warnings.push({
            row: i + 2,
            message: `Missing HUB value for agent "${agent}" - terminal will not be created`,
            data: JSON.stringify({ agent, hub: data.hub })
          })
        }

        // Extract customer info
        if (cid && custname) {
          if (!customersMap.has(cid)) {
            customersMap.set(cid, {
              cid: cid,
              name: custname,
              address: data.address?.toString().trim() || '',
              city: data.city?.toString().trim() || '',
              state: data.state?.toString().trim() || '',
              zipCode: data.zipCode?.toString().trim() || '',
              latitude: data.latitude ? parseFloat(data.latitude) : null,
              longitude: data.longitude ? parseFloat(data.longitude) : null,
              openTime: data.openTime || '',
              closeTime: data.closeTime || '',
              lanterID: data.lanterID?.toString().trim() || '',
              customerPDC: data.customerPDC?.toString().trim() || '',
              geoResult: data.geoResult?.toString().trim() || ''
            })
          }
        }

        // Extract route info
        if (trkid) {
          if (!routesMap.has(trkid)) {
            const routeData: any = {
              trkid: trkid,
              hub: hub, // Store the HUB field for terminal linking
              agent: agent, // Store the agent field for reference
            }

            routesMap.set(trkid, routeData)
          }
        }

        // Add route stop with ALL row data (source of truth)
        routeStops.push({
          routeTrkid: trkid,
          customerCid: cid,
          sequence: data.sequence || 0,
          eta: data.eta || '',
          etd: data.etd || '',
          commitTime: data.commitTime || '',
          fixedTime: data.fixedTime || null,
          cube: data.cube || null,
          timeZone: data.timeZone || '',
          lanterID: data.lanterID || '',
          customerPDC: data.customerPDC || '',
          // Store all customer data per route-stop (source of truth)
          cid: cid,
          custName: custname,
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          openTime: data.openTime || '',
          closeTime: data.closeTime || '',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          geoResult: data.geoResult || ''
        })
      } catch (error) {
        warnings.push({
          row: i + 2,
          message: `Error processing route data: ${error}`,
          data: JSON.stringify(data)
        })
      }
    }

    // Total stops will be calculated dynamically by the routes service hooks

    // Save to database services (reusing logic from original processLanterEndpointsImport)
    let terminalsProcessed = 0
    let customersProcessed = 0
    let routesProcessed = 0
    let routeStopsProcessed = 0

    try {
      // Save terminals
      const terminalService = this.app.service('terminals')
      for (const terminal of terminalsMap.values()) {
        try {
          await terminalService.create(terminal)
          terminalsProcessed++
        } catch (error) {
          warnings.push({
            row: 0,
            message: `Failed to save terminal ${terminal.name}: ${error}`,
            data: terminal.name
          })
        }
      }

      // Save customers
      const customerService = this.app.service('customers')
      const customerIdMap = new Map<string, string>()

      for (const customer of customersMap.values()) {
        try {
          const savedCustomer = await customerService.create(customer)
          customerIdMap.set(customer.cid, savedCustomer._id?.toString() || '')
          customersProcessed++
        } catch (error) {
          warnings.push({
            row: 0,
            message: `Failed to save customer ${customer.name}: ${error}`,
            data: customer.cid
          })
        }
      }

      // Save routes (need to link to terminals)
      const routeService = this.app.service('routes')
      const routeIdMap = new Map<string, string>()

      // First, get the saved terminal IDs for linking
      const terminalIdMap = new Map<string, string>()
      const savedTerminals = await terminalService.find({ query: { $limit: 10000 } })
      for (const terminal of savedTerminals.data) {
        // Use terminal name (HUB value) as key for linking
        const terminalKey = terminal.name
        terminalIdMap.set(terminalKey, terminal._id?.toString() || '')
      }

      for (const route of routesMap.values()) {
        try {
          // Find terminal for this route using the HUB field
          const terminalKey = route.hub || ''
          const terminalId = terminalIdMap.get(terminalKey)

          // Only include valid fields for route creation
          const routeData: any = {
            trkid: route.trkid,
            // Default schedule: Monday through Friday
            sun: false,
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: false
          }

          // Link to terminal if found
          if (terminalId) {
            routeData.terminalId = terminalId
          }

          const savedRoute = await routeService.create(routeData)
          routeIdMap.set(route.trkid, savedRoute._id?.toString() || '')
          routesProcessed++
        } catch (error) {
          warnings.push({
            row: 0,
            message: `Failed to save route ${route.trkid}: ${error}`,
            data: route.trkid
          })
        }
      }

      // Save route stops (need to link to routes and customers)
      const routeStopService = this.app.service('route-stops')
      for (const stop of routeStops) {
        try {
          const routeId = routeIdMap.get(stop.routeTrkid)
          const customerId = customerIdMap.get(stop.customerCid)

          // Create stop data with required fields
          const stopData: any = {
            routeId: routeId || null,
            customerId: customerId || null,
            sequence: typeof stop.sequence === 'number' ? stop.sequence : 0,
            eta: stop.eta || '',
            etd: stop.etd || '',
            commitTime: stop.commitTime || '',
            fixedTime: typeof stop.fixedTime === 'number' ? stop.fixedTime : undefined,
            cube: typeof stop.cube === 'number' ? stop.cube : undefined,
            timeZone: stop.timeZone || '',
            lanterID: stop.lanterID || '',
            customerPDC: stop.customerPDC || '',
            // Add all customer data fields (source of truth)
            cid: stop.cid || '',
            custName: stop.custName || '',
            address: stop.address || '',
            city: stop.city || '',
            state: stop.state || '',
            zipCode: stop.zipCode || '',
            openTime: stop.openTime || '',
            closeTime: stop.closeTime || '',
            latitude: typeof stop.latitude === 'number' ? stop.latitude : undefined,
            longitude: typeof stop.longitude === 'number' ? stop.longitude : undefined,
            geoResult: stop.geoResult || ''
          }

          await routeStopService.create(stopData)
          routeStopsProcessed++
        } catch (error) {
          console.error(`Route stop save error for ${stop.routeTrkid} -> ${stop.customerCid}:`, error)
          warnings.push({
            row: 0,
            message: `Failed to save route stop: ${error}`,
            data: `${stop.routeTrkid} -> ${stop.customerCid}`
          })
        }
      }
    } catch (error) {
      throw new Error(`Database save failed: ${error}`)
    }

    return {
      terminalsProcessed,
      customersProcessed,
      routesProcessed,
      routeStopsProcessed
    }
  }

  private async applyTerminalUpdates(
    terminalsUpdates: any[],
    warnings: Array<{ row: number; message: string; data: string }>
  ): Promise<number> {
    const terminalService = this.app.service('terminals')
    let terminalsUpdated = 0

    try {
      // Get all existing terminals to match against
      const existingTerminals = await terminalService.find({ query: { $limit: 10000 } })

      // Create a fast lookup map (case-insensitive)
      const terminalLookup = new Map<string, any>()
      for (const terminal of existingTerminals.data) {
        terminalLookup.set(terminal.name.toLowerCase(), terminal)
      }

      // Process updates in smaller batches to avoid timeouts
      const batchSize = 10
      for (let i = 0; i < terminalsUpdates.length; i += batchSize) {
        const batch = terminalsUpdates.slice(i, i + batchSize)
        const batchPromises: Promise<void>[] = []

        for (const update of batch) {
          const updatePromise = this.processTerminalUpdate(
            update,
            terminalLookup,
            terminalService,
            warnings
          ).then(updated => {
            if (updated) terminalsUpdated++
          })
          batchPromises.push(updatePromise)
        }

        // Wait for current batch to complete before processing next batch
        await Promise.all(batchPromises)
      }
    } catch (error) {
      warnings.push({
        row: 0,
        message: `Failed to process terminal updates: ${error}`,
        data: 'Terminal updates'
      })
    }

    return terminalsUpdated
  }

  private async fillMissingCityState(
    warnings: Array<{ row: number; message: string; data: string }>
  ): Promise<number> {
    const terminalService = this.app.service('terminals')
    let terminalsUpdated = 0

    try {
      // Get all existing terminals
      const existingTerminals = await terminalService.find({ query: { $limit: 10000 } })
      
      // Find terminals with empty city or state
      const terminalsNeedingUpdate = existingTerminals.data.filter((terminal: any) => 
        !terminal.city || !terminal.state || terminal.city.trim() === '' || terminal.state.trim() === ''
      )

      console.log(`Found ${terminalsNeedingUpdate.length} terminals with missing city/state data`)

      // Update each terminal by parsing its name
      for (const terminal of terminalsNeedingUpdate) {
        try {
          const { city, state } = this.parseCityState(terminal.name)
          
          if (city || state) {
            const updateData: any = {}
            
            // Only update if we have a city and the current city is empty
            if (city && (!terminal.city || terminal.city.trim() === '')) {
              updateData.city = city
            }
            
            // Only update if we have a state and the current state is empty  
            if (state && (!terminal.state || terminal.state.trim() === '')) {
              updateData.state = state
            }

            // Always update cName to ensure it's current
            if (terminal.name) {
              updateData.cName = this.generateCompliantName(terminal.name)
            }

            if (Object.keys(updateData).length > 0) {
              console.log(`Fallback update for terminal "${terminal.name}": city="${updateData.city || terminal.city}", state="${updateData.state || terminal.state}"`)
              await terminalService.patch(terminal._id.toString(), updateData)
              terminalsUpdated++
            }
          }
        } catch (error) {
          warnings.push({
            row: 0,
            message: `Failed to apply fallback city/state parsing for terminal "${terminal.name}": ${error}`,
            data: terminal.name
          })
        }
      }

      console.log(`Applied fallback city/state parsing to ${terminalsUpdated} terminals`)
    } catch (error) {
      warnings.push({
        row: 0,
        message: `Failed to apply fallback city/state parsing: ${error}`,
        data: 'Fallback parsing'
      })
    }

    return terminalsUpdated
  }

  private async processTerminalUpdate(
    update: any,
    terminalLookup: Map<string, any>,
    terminalService: any,
    warnings: Array<{ row: number; message: string; data: string }>
  ): Promise<boolean> {
    try {
      // Find existing terminal by name (case-insensitive)
      const existingTerminal = terminalLookup.get(update.name.toLowerCase())

      if (existingTerminal) {
        // Prepare update data with only fields that have values
        const updateData: any = {}

        if (update.city && update.city.trim()) {
          updateData.city = update.city.trim()
        }
        if (update.state && update.state.trim()) {
          updateData.state = update.state.trim()
        }
        // Handle group and terminalType fields
        if (update.group && update.group.trim()) {
          updateData.group = update.group.trim()
          updateData.terminalType = 'terminal'  // Has group = terminal
        } else if (update.terminalType) {
          updateData.terminalType = update.terminalType  // Use the type from preview
        }
        if (update.streetAddress && update.streetAddress.trim()) {
          updateData.streetAddress = update.streetAddress.trim()
        }
        if (update.streetAddress2 && update.streetAddress2.trim()) {
          updateData.streetAddress2 = update.streetAddress2.trim()
        }
        if (update.zip && update.zip.trim()) {
          updateData.zip = update.zip.trim()
        }
        if (update.country && update.country.trim()) {
          updateData.country = update.country.trim()
        }
        if (update.fullAddress && update.fullAddress.trim()) {
          updateData.fullName = update.fullAddress.trim()
        }
        if (update.worklist && update.worklist.trim()) {
          updateData.worklist = update.worklist.trim()
        }
        if (update.latitude && !isNaN(parseFloat(update.latitude))) {
          updateData.latitude = parseFloat(update.latitude)
        }
        if (update.longitude && !isNaN(parseFloat(update.longitude))) {
          updateData.longitude = parseFloat(update.longitude)
        }

        // Always update cName if terminal name exists
        if (existingTerminal.name) {
          updateData.cName = this.generateCompliantName(existingTerminal.name)
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length > 0) {
          await terminalService.patch(existingTerminal._id.toString(), updateData)
          return true
        }
      } else {
        warnings.push({
          row: 0,
          message: `Terminal "${update.name}" not found in database - skipping update`,
          data: update.name
        })
      }
      return false
    } catch (error) {
      warnings.push({
        row: 0,
        message: `Failed to update terminal ${update.name}: ${error}`,
        data: update.name
      })
      return false
    }
  }

  private async processDriversData(
    driversData: any[],
    warnings: Array<{ row: number; message: string; data: string }>
  ): Promise<number> {
    const driverService = this.app.service('drivers')
    let driversProcessed = 0

    try {

      for (const driverData of driversData) {
        try {
          // Check for existing driver with same license number or geotab ID
          const existingDriverQuery: any = {
            $or: []
          }

          // Add license number check if present
          if (driverData.licenseNumber && driverData.licenseNumber.trim()) {
            existingDriverQuery.$or.push({
              licenseNumber: driverData.licenseNumber.trim()
            })
          }

          // Add geotab ID check if present
          if (driverData.geotab && driverData.geotab.trim()) {
            existingDriverQuery.$or.push({
              geotab: driverData.geotab.trim()
            })
          }

          // Only check for duplicates if we have at least one identifier
          if (existingDriverQuery.$or.length > 0) {
            const existingDrivers = await driverService.find({
              query: {
                ...existingDriverQuery,
                $limit: 1
              },
              paginate: false
            }) as unknown as any[]

            if (existingDrivers && existingDrivers.length > 0) {
              const existingDriver = existingDrivers[0]
              warnings.push({
                row: 0,
                message: `Driver ${driverData.firstName} ${driverData.lastName} already exists (License: ${driverData.licenseNumber || 'N/A'}, Geotab: ${driverData.geotab || 'N/A'}) - skipping duplicate`,
                data: `${driverData.firstName} ${driverData.lastName} (existing: ${existingDriver.firstName} ${existingDriver.lastName})`
              })
              continue // Skip creating this driver
            }
          }

          // No duplicate found, create the driver
          await driverService.create(driverData)
          driversProcessed++
        } catch (error) {
          warnings.push({
            row: 0,
            message: `Failed to save driver ${driverData.firstName} ${driverData.lastName}: ${error}`,
            data: `${driverData.firstName} ${driverData.lastName}`
          })
        }
      }

    } catch (error) {
      warnings.push({
        row: 0,
        message: `Failed to process drivers data: ${error}`,
        data: 'Drivers processing'
      })
    }

    return driversProcessed
  }

  private async processDriverBoardImport(buffer: Buffer): Promise<ImportProcess> {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file')
    }

    const warnings: Array<{ row: number; message: string; data: string }> = []
    let driverBoardData: any[] = []
    let terminalSupervisorData: any[] = []

    // Find all DB- prefixed sheets
    const driverBoardSheets = workbook.SheetNames.filter(name => name.toUpperCase().startsWith('DB-'))
    
    // Find SUP-Terminal sheet
    const supTerminalSheet = workbook.SheetNames.find(name => name.toUpperCase() === 'SUP-TERMINAL')

    if (driverBoardSheets.length === 0) {
      warnings.push({
        row: 0,
        message: 'No driver board sheets found - sheets should start with "DB-"',
        data: 'Sheet detection'
      })
    } else {

      for (const sheetName of driverBoardSheets) {
        const sheetResult = this.parseDriverBoardSheetForImport(workbook.Sheets[sheetName], sheetName)
        driverBoardData.push(...sheetResult.data)
        warnings.push(...sheetResult.warnings.map(w => ({ row: 0, message: w, data: sheetName })))
      }
    }

    // Process SUP-Terminal sheet if found
    if (supTerminalSheet) {
      const terminalResult = this.parseTerminalSupervisorSheetForImport(workbook.Sheets[supTerminalSheet])
      terminalSupervisorData = terminalResult.data
      warnings.push(...terminalResult.warnings.map(w => ({ row: 0, message: w, data: 'SUP-Terminal' })))
    } else {
      warnings.push({
        row: 0,
        message: 'SUP-Terminal sheet not found - no terminal supervisors will be imported',
        data: 'Sheet detection'
      })
    }

    // Process the driver board data and terminal supervisors
    return this.processDriverBoardAndTerminalData(driverBoardData, terminalSupervisorData, warnings)
  }

  private parseDriverBoardSheetForImport(worksheet: XLSX.WorkSheet, sheetName: string): { data: any[]; warnings: string[] } {
    // Reuse the existing logic from import-preview service
    const importPreviewService = new ImportPreviewService(this.app)
    const driverBoardResult = (importPreviewService as any).parseDriverBoardSheet(worksheet, sheetName)

    return {
      data: driverBoardResult.data,
      warnings: driverBoardResult.warnings
    }
  }

  private parseTerminalSupervisorSheetForImport(worksheet: XLSX.WorkSheet): { data: any[]; warnings: string[] } {
    const warnings: string[] = []
    const data: any[] = []

    try {
      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      if (jsonData.length === 0) {
        warnings.push('SUP-Terminal sheet is empty')
        return { data, warnings }
      }

      // Validate headers - expecting: Terminal, Name, Position
      const firstRow = jsonData[0] as any
      const headers = Object.keys(firstRow)
      
      const expectedHeaders = ['Terminal', 'Name', 'Position']
      const missingHeaders = expectedHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        warnings.push(`Missing headers in SUP-Terminal sheet: ${missingHeaders.join(', ')}`)
      }

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any
        const rowNum = i + 2 // Excel row number (1-indexed + header)

        try {
          const terminal = row.Terminal?.toString().trim() || ''
          const name = row.Name?.toString().trim() || ''
          const position = row.Position?.toString().trim() || ''

          if (!terminal) {
            warnings.push(`Row ${rowNum}: Missing terminal name`)
            continue
          }

          if (!name) {
            warnings.push(`Row ${rowNum}: Missing name`)
            continue
          }

          if (!position) {
            warnings.push(`Row ${rowNum}: Missing position`)
            continue
          }

          data.push({
            terminal,
            name,
            position,
            isBenchDriver: position.toLowerCase().includes('bench driver')
          })

        } catch (error) {
          warnings.push(`Row ${rowNum}: Error processing row - ${error}`)
        }
      }

    } catch (error) {
      warnings.push(`Failed to parse SUP-Terminal sheet: ${error}`)
    }

    return { data, warnings }
  }

  private async processDriverBoardAndTerminalData(
    driverBoardData: any[],
    terminalSupervisorData: any[],
    initialWarnings: Array<{ row: number; message: string; data: string }>
  ): Promise<ImportProcess> {
    const warnings = [...initialWarnings]
    let routesUpdated = 0
    let equipmentCreated = 0
    const unmatchedRoutes: string[] = []
    const unmatchedDrivers: string[] = []


    // Get existing routes and drivers for lookups
    const routeService = this.app.service('routes')
    const driverService = this.app.service('drivers')
    const equipmentService = this.app.service('equipment')
    const fleetService = this.app.service('fleet')

    try {
      // Create lookup maps
      const existingRoutes = await routeService.find({ query: { $limit: 10000 } })
      const routeLookup = new Map<string, any>()
      
      for (const route of existingRoutes.data) {
        // Use trkid as the lookup key with multiple variations for better matching
        const trkidLower = route.trkid.toLowerCase()
        routeLookup.set(trkidLower, route)
        
        // Also try without dots and with spaces replaced
        const trkidNoDots = trkidLower.replace(/\./g, '')
        const trkidSpaces = trkidLower.replace(/\./g, ' ')
        routeLookup.set(trkidNoDots, route)
        routeLookup.set(trkidSpaces, route)
        
        // Log first few routes for debugging
        if (routeLookup.size <= 5) {
        }
      }

      const existingDrivers = await driverService.find({ query: { $limit: 10000 } })
      const driverLookup = new Map<string, any>()
      for (const driver of existingDrivers.data) {
        // Create multiple lookup keys for driver matching
        const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase()
        const lastFirst = `${driver.lastName}, ${driver.firstName}`.toLowerCase()
        const firstLast = `${driver.firstName} ${driver.lastName}`.toLowerCase()
        
        driverLookup.set(fullName, driver)
        driverLookup.set(lastFirst, driver)
        driverLookup.set(firstLast, driver)
        
        // Also try just last name for matching
        driverLookup.set(driver.lastName.toLowerCase(), driver)
      }


      // Process each driver board entry
      for (let i = 0; i < driverBoardData.length; i++) {
        const entry = driverBoardData[i]

        try {
          // Find the route - try multiple variations for better matching
          const routeKey = entry.route.toLowerCase()
          let route = routeLookup.get(routeKey)
          
          // Try variations if exact match fails
          if (!route) {
            const routeKeyNoDots = routeKey.replace(/\./g, '')
            const routeKeySpaces = routeKey.replace(/\./g, ' ')
            
            route = routeLookup.get(routeKeyNoDots) || routeLookup.get(routeKeySpaces)
          }
          
          if (!route) {
            unmatchedRoutes.push(entry.route)
            warnings.push({
              row: i + 2,
              message: `Route "${entry.route}" not found in database`,
              data: entry.route
            })
            continue
          } else {
          }

          // Find the driver if specified
          let driverId = null
          if (entry.driver && entry.driver.trim()) {
            const driver = driverLookup.get(entry.driver.toLowerCase().trim())
            if (driver) {
              driverId = driver._id
            } else {
              unmatchedDrivers.push(entry.driver)
              warnings.push({
                row: i + 2,
                message: `Driver "${entry.driver}" not found in database`,
                data: entry.driver
              })
            }
          }

          // Update the route with driver board information
          const routeUpdates: any = {}
          
          if (entry.truckNumber) {
            routeUpdates.truckNumber = entry.truckNumber
          }
          
          if (driverId) {
            routeUpdates.defaultDriverId = driverId
          }
          
          if (entry.fuelCard) {
            routeUpdates.fuelCard = entry.fuelCard
          }
          
          if (entry.scanner) {
            routeUpdates.scanner = entry.scanner
          }
          
          if (entry.departureTime) {
            routeUpdates.departureTime = entry.departureTime
          }

          // Only update if we have data to update
          if (Object.keys(routeUpdates).length > 0) {
            await routeService.patch(route._id, routeUpdates)
            routesUpdated++
          } else {
          }

          // Create route substitution for substitute truck if provided
          if (entry.subUnit) {
            const routeSubstitutionService = this.app.service('route-substitution')
            
            try {
              // Check if an existing substitution already exists for this route and truck
              const existingSubstitutions = await routeSubstitutionService.find({
                query: {
                  routeId: route._id.toString(),
                  truckNumber: entry.subUnit,
                  $limit: 1
                },
                paginate: false
              } as unknown as any)

              // Only create if no existing substitution found
              if (!existingSubstitutions || (Array.isArray(existingSubstitutions) && existingSubstitutions.length === 0)) {
                const substitutionData = {
                  routeId: route._id.toString(),
                  truckNumber: entry.subUnit,
                  startDate: new Date().toISOString().split('T')[0], // Use import date as start date
                  // No end date means this is an ongoing substitution
                }

                await routeSubstitutionService.create(substitutionData)
              }
            } catch (error) {
              warnings.push({
                row: i + 2,
                message: `Failed to create route substitution for substitute truck ${entry.subUnit}: ${error}`,
                data: `Route: ${entry.route}, SubUnit: ${entry.subUnit}`
              })
            }
          }

          // Get terminal from the route's assigned terminal
          let terminalId = null
          if (route && route.terminalId) {
            terminalId = new ObjectId(route.terminalId.toString())
          }

          // Create/update equipment entries
          if (entry.truckNumber) {
            await equipmentService.createOrUpdate({
              equipmentNumber: entry.truckNumber,
              equipmentType: 'truck',
              status: 'active',
              equipmentStatus: 'dedicated',
              truckType: entry.truckType || undefined,
              notes: `Assigned to route ${entry.route}`
            })
            equipmentCreated++

            // Create/update fleet entry for truck
            const fleetData: any = {
              truckID: entry.truckNumber,
              vehicleType: entry.truckType === 'TT' ? 'TT' : 'ST',
              status: 'active',
              notes: `Imported from ${entry.sheetName} - Route: ${entry.route}${terminalId ? ` (Terminal: ${route.terminal?.name || 'Unknown'})` : ''}`
            }
            if (terminalId) {
              fleetData.terminalId = terminalId
            }
            await fleetService.createOrUpdateByTruckID(fleetData)
          }

          if (entry.subUnit) {
            await equipmentService.createOrUpdate({
              equipmentNumber: entry.subUnit,
              equipmentType: 'sub-unit',
              status: 'active',
              equipmentStatus: 'substitute',
              truckType: entry.truckType || undefined,
              notes: `Sub-unit for route ${entry.route}`
            })
            equipmentCreated++

            // Create/update fleet entry for sub-unit (if it's a valid truck ID)
            const subUnitFleetData: any = {
              truckID: entry.subUnit,
              vehicleType: entry.truckType === 'TT' ? 'TT' : 'ST', 
              status: 'active',
              notes: `Imported from ${entry.sheetName} - Sub-unit for Route: ${entry.route}${terminalId ? ` (Terminal: ${route.terminal?.name || 'Unknown'})` : ''}`
            }
            if (terminalId) {
              subUnitFleetData.terminalId = terminalId
            }
            await fleetService.createOrUpdateByTruckID(subUnitFleetData)
          }

        } catch (error) {
          warnings.push({
            row: i + 2,
            message: `Error processing driver board entry: ${error}`,
            data: JSON.stringify(entry)
          })
        }
      }

    } catch (error) {
      throw new Error(`Driver board processing failed: ${error}`)
    }

    // Process terminal supervisors
    let terminalsUpdated = 0
    const unmatchedTerminals: string[] = []
    const unmatchedBenchDrivers: string[] = []

    if (terminalSupervisorData.length > 0) {
      try {
        const terminalService = this.app.service('terminals')
        const driverService = this.app.service('drivers')

        // Get existing terminals for lookup
        const existingTerminals = await terminalService.find({ query: { $limit: 10000 } })
        const terminalLookup = new Map<string, any>()
        
        for (const terminal of existingTerminals.data) {
          terminalLookup.set(terminal.name.toLowerCase(), terminal)
        }

        // Get existing drivers for bench driver lookup (using individual get() calls per CLAUDE.md guidance)
        const existingDrivers = await driverService.find({ query: { $limit: 10000 } })
        const driverLookup = new Map<string, any>()
        
        for (const driver of existingDrivers.data) {
          const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase()
          driverLookup.set(fullName, driver)
        }

        // Group supervisors by terminal
        const terminalGroups = new Map<string, any[]>()
        
        for (const supervisor of terminalSupervisorData) {
          if (!terminalGroups.has(supervisor.terminal)) {
            terminalGroups.set(supervisor.terminal, [])
          }
          terminalGroups.get(supervisor.terminal)!.push(supervisor)
        }

        // Process each terminal's supervisors
        for (const [terminalName, supervisors] of terminalGroups) {
          const terminal = terminalLookup.get(terminalName.toLowerCase())
          
          if (!terminal) {
            unmatchedTerminals.push(terminalName)
            warnings.push({
              row: 0,
              message: `Terminal "${terminalName}" not found in database`,
              data: terminalName
            })
            continue
          }

          const benchDriverIds: string[] = []
          const leaders: Array<{ name: string; title: string }> = []

          // Process each supervisor for this terminal
          for (const supervisor of supervisors) {
            if (supervisor.isBenchDriver) {
              // Look up driver by name
              const driver = driverLookup.get(supervisor.name.toLowerCase())
              if (driver) {
                benchDriverIds.push(driver._id.toString())
              } else {
                unmatchedBenchDrivers.push(supervisor.name)
                warnings.push({
                  row: 0,
                  message: `Bench driver "${supervisor.name}" not found in database`,
                  data: `Terminal: ${terminalName}, Driver: ${supervisor.name}`
                })
              }
            } else {
              // Add to leaders list
              leaders.push({
                name: supervisor.name,
                title: supervisor.position
              })
            }
          }

          // Update the terminal with bench drivers and leaders
          const updateData: any = {}
          
          if (benchDriverIds.length > 0) {
            updateData.bench = benchDriverIds
          }
          
          if (leaders.length > 0) {
            updateData.leaders = leaders
          }

          // Always update cName if terminal name exists  
          if (terminal.name) {
            updateData.cName = this.generateCompliantName(terminal.name)
          }

          if (Object.keys(updateData).length > 0) {
            await terminalService.patch(terminal._id.toString(), updateData)
            terminalsUpdated++
          }
        }

      } catch (error) {
        warnings.push({
          row: 0,
          message: `Terminal supervisor processing failed: ${error}`,
          data: 'Terminal supervisors'
        })
      }
    }

    // Generate post-installation report
    const postInstallReport: string[] = []
    
    if (unmatchedRoutes.length > 0) {
      postInstallReport.push(`Unmatched Routes (${unmatchedRoutes.length}):`)
      postInstallReport.push(...unmatchedRoutes.map(route => `  - ${route}`))
    }
    
    if (unmatchedDrivers.length > 0) {
      postInstallReport.push(`Unmatched Drivers (${unmatchedDrivers.length}):`)
      postInstallReport.push(...unmatchedDrivers.map(driver => `  - ${driver}`))
    }

    if (unmatchedTerminals.length > 0) {
      postInstallReport.push(`Unmatched Terminals (${unmatchedTerminals.length}):`)
      postInstallReport.push(...unmatchedTerminals.map(terminal => `  - ${terminal}`))
    }

    if (unmatchedBenchDrivers.length > 0) {
      postInstallReport.push(`Unmatched Bench Drivers (${unmatchedBenchDrivers.length}):`)
      postInstallReport.push(...unmatchedBenchDrivers.map(driver => `  - ${driver}`))
    }

    // Add post-installation report to warnings if there are unmatched items
    if (postInstallReport.length > 0) {
      warnings.push({
        row: 0,
        message: 'Post-Installation Report - Items that could not be matched',
        data: postInstallReport.join('\n')
      })
    }

    return {
      _id: new Date().getTime().toString(),
      success: true,
      message: `Driver board import completed successfully! Updated ${routesUpdated} routes, created/updated ${equipmentCreated} equipment entries, updated ${terminalsUpdated} terminals with supervisors. ${unmatchedRoutes.length} routes, ${unmatchedDrivers.length} drivers, ${unmatchedTerminals.length} terminals, and ${unmatchedBenchDrivers.length} bench drivers could not be matched.`,
      summary: {
        terminalsProcessed: terminalsUpdated,
        customersProcessed: 0,
        routesProcessed: routesUpdated,
        routeStopsProcessed: 0,
        equipmentProcessed: equipmentCreated,
        unmatchedRoutes: unmatchedRoutes.length,
        unmatchedDrivers: unmatchedDrivers.length,
        unmatchedTerminals: unmatchedTerminals.length,
        unmatchedBenchDrivers: unmatchedBenchDrivers.length,
        totalRows: driverBoardData.length + terminalSupervisorData.length
      },
      warnings,
      createdAt: new Date().toISOString()
    }
  }
}
