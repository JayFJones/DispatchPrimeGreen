import type { Params, ServiceInterface } from '@feathersjs/feathers'
import type { Application } from '../../declarations'
import type { ImportPreview, ImportPreviewData } from './import-preview.schema'
import * as XLSX from 'xlsx'
import { UserRole } from '../users/users.schema'
import { Forbidden } from '@feathersjs/errors'

export type { ImportPreview, ImportPreviewData }

export interface ImportPreviewParams extends Params {
  file?: Express.Multer.File
  fileName?: string
  importType?: string
}

interface TerminalRouteRow {
  terminalName: string
  terminalCode: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  routeName: string
  routeCode: string
  distanceMiles?: number
  estimatedTimeHours?: number
}

export class ImportPreviewService
  implements ServiceInterface<ImportPreview, ImportPreviewData, ImportPreviewParams>
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

  // Helper function to standardize time formats
  private parseTimeValue(timeValue: any): string {
    if (!timeValue || timeValue === '') return ''

    try {
      // Check if this is an Excel date/time number
      if (typeof timeValue === 'number') {
        // Use XLSX utility to convert Excel date number to JavaScript Date
        const excelDate = XLSX.SSF.parse_date_code(timeValue)
        if (excelDate) {
          // Extract hours and minutes from the parsed date
          const hours = excelDate.H || 0
          const minutes = excelDate.M || 0

          // Ensure valid time
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
          }
        }
      }

      const timeStr = timeValue.toString().trim()
      if (!timeStr) return ''

      // Handle various time formats and convert to HH:MM format
      // Remove any non-digit, non-colon, non-space, non-AM/PM characters
      let cleanTime = timeStr.replace(/[^\d:\sAaPpMm]/g, '')

      // Handle AM/PM format
      const isAM = /AM?/i.test(cleanTime)
      const isPM = /PM?/i.test(cleanTime)
      cleanTime = cleanTime.replace(/[AaPpMm\s]/g, '')

      // If no colon and 3-4 digits, assume HHMM or HMM format
      if (!cleanTime.includes(':') && cleanTime.length >= 3) {
        if (cleanTime.length === 3) {
          // HMM format (e.g., 930 = 9:30)
          cleanTime = `${cleanTime.slice(0, 1)}:${cleanTime.slice(1)}`
        } else if (cleanTime.length === 4) {
          // HHMM format (e.g., 1430 = 14:30)
          cleanTime = `${cleanTime.slice(0, 2)}:${cleanTime.slice(2)}`
        }
      }

      // Parse hours, minutes, and optionally seconds
      const timeParts = cleanTime.split(':')
      if (timeParts.length >= 2) {
        let hours = parseInt(timeParts[0], 10)
        const minutes = parseInt(timeParts[1], 10)
        // Ignore seconds if present (timeParts[2])

        if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) {
          return timeStr // Return original if parsing fails
        }

        // Handle AM/PM conversion
        if (isPM && hours < 12) {
          hours += 12
        } else if (isAM && hours === 12) {
          hours = 0
        }

        // Ensure valid hour range
        if (hours < 0 || hours > 23) {
          return timeStr // Return original if invalid
        }

        // Format as HH:MM
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }

      return timeStr // Return original string if all parsing attempts fail
    } catch (error) {
      return timeValue?.toString() || ''
    }
  }

  async create(data: ImportPreviewData, params?: ImportPreviewParams): Promise<ImportPreview> {
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
      const fileName = data.fileName.toLowerCase()
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        throw new Error('File must be an Excel spreadsheet (.xlsx or .xls)')
      }

      let previewData: any[] = []
      let warnings: string[] = []

      let worksheetSummary: any = undefined

      if (data.importType === 'terminal-routes') {
        const result = this.parseTerminalRouteExcel(buffer)
        previewData = result.data
        warnings = result.warnings
      } else if (data.importType === 'lanter-endpoints') {
        const result = this.parseLanterEndpointsExcel(buffer)
        previewData = result.data
        warnings = result.warnings
        worksheetSummary = result.importSummary
      } else if (data.importType === 'driver-board') {
        const result = this.parseDriverBoardExcel(buffer)
        previewData = result.data
        warnings = result.warnings
        worksheetSummary = result.importSummary
      } else {
        console.error('Unsupported import type:', data.importType)
        throw new Error(
          `Unsupported import type: ${data.importType}. Supported types are: terminal-routes, lanter-endpoints, driver-board`
        )
      }

      return {
        _id: new Date().getTime().toString(),
        success: true,
        totalRows: previewData.length,
        data: previewData.slice(0, 10), // Limit preview to first 10 rows
        worksheetSummary,
        importSummary: worksheetSummary, // For lanter-endpoints, this will be the import summary
        warnings,
        createdAt: new Date().toISOString()
      }
    } catch (error: any) {
      console.error('ImportPreview error:', error)
      return {
        _id: new Date().getTime().toString(),
        success: false,
        totalRows: 0,
        data: [],
        warnings: [error.message || 'Failed to preview file data'],
        createdAt: new Date().toISOString()
      }
    }
  }

  private parseTerminalRouteExcel(buffer: Buffer): { data: any[]; warnings: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row')
    }

    const headers = jsonData[0].map((header: string) => header?.toString().toLowerCase().trim())
    const rows = jsonData.slice(1)

    // Map expected column names to possible variations for legacy compatibility
    // Note: This uses a subset of the expectedHeaders from analyzeWorksheets for core preview functionality
    const columnMappings = {
      terminalName: ['terminal name', 'terminal', 'terminal_name'],
      terminalCode: ['terminal code', 'terminal_code', 'code'],
      address: ['address', 'street address', 'street'],
      city: ['city'],
      state: ['state', 'st'],
      zipCode: ['zip code', 'zip', 'postal code', 'zipcode', 'zip_code'],
      routeName: ['route name', 'route', 'route_name'],
      routeCode: ['route code', 'route_code', 'route id', 'route_id'],
      distanceMiles: ['distance miles', 'distance', 'miles', 'distance_miles'],
      estimatedTimeHours: ['estimated time hours', 'time hours', 'hours', 'estimated_time_hours', 'time']
    }

    // Find column indices
    const columnIndices: Record<string, number> = {}

    for (const [field, variations] of Object.entries(columnMappings)) {
      const index = headers.findIndex(header => variations.some(variation => header.includes(variation)))
      if (index !== -1) {
        columnIndices[field] = index
      }
    }

    // Validate that we can find core required headers for preview
    const coreRequiredFields = ['terminalName', 'city', 'state']
    const missingFields = coreRequiredFields.filter(field => columnIndices[field] === undefined)
    const warnings: string[] = []

    if (missingFields.length > 0) {
      warnings.push(`Preview may be incomplete - missing core fields: ${missingFields.join(', ')}`)
    }

    // Parse rows
    const parsedData: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue

      try {
        const data: any = {
          terminalName: row[columnIndices.terminalName]?.toString().trim() || '',
          terminalCode: row[columnIndices.terminalCode]?.toString().trim() || '',
          address: row[columnIndices.address]?.toString().trim() || 'N/A',
          city: row[columnIndices.city]?.toString().trim() || 'N/A',
          state: row[columnIndices.state]?.toString().trim() || 'N/A',
          zipCode: row[columnIndices.zipCode]?.toString().trim() || 'N/A',
          routeName: row[columnIndices.routeName]?.toString().trim() || '',
          routeCode: row[columnIndices.routeCode]?.toString().trim() || '',
          distanceMiles: 'N/A',
          estimatedTimeHours: 'N/A'
        }

        // Parse numeric fields
        if (columnIndices.distanceMiles !== undefined && row[columnIndices.distanceMiles]) {
          const distance = parseFloat(row[columnIndices.distanceMiles])
          if (!isNaN(distance)) data.distanceMiles = distance
        }

        if (columnIndices.estimatedTimeHours !== undefined && row[columnIndices.estimatedTimeHours]) {
          const time = parseFloat(row[columnIndices.estimatedTimeHours])
          if (!isNaN(time)) data.estimatedTimeHours = time
        }

        // Validate required fields
        if (!data.terminalName || !data.terminalCode || !data.routeName || !data.routeCode) {
          warnings.push(`Row ${i + 2}: Missing required data, skipped`)
          continue
        }

        parsedData.push(data)
      } catch (error) {
        warnings.push(`Row ${i + 2}: Error parsing data - ${error}`)
        continue
      }
    }

    return { data: parsedData, warnings }
  }

  private parseDispatchRoutingXlsx(buffer: Buffer): { data: any[]; warnings: string[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row')
    }

    const headers = jsonData[0].map((header: string) => header?.toString().toLowerCase().trim())
    const rows = jsonData.slice(1)
    const warnings: string[] = []

    // Map headers to field names for data parsing
    // Note: This uses a subset of the expectedHeaders from analyzeWorksheets for core preview functionality
    const headerMappings = {
      agent: ['agent'],
      routeNumber: ['routenumber'],
      cid: ['cid'],
      dealerName: ['dealer name'],
      city: ['city'],
      state: ['st'],
      zipCode: ['zip'],
      eta: ['eta'],
      etd: ['etd'],
      dealerOpen: ['open'],
      dealerClose: ['close'],
      deliveryXDock: ['delivery x-dock'],
      lanterID: ['lanter id'],
      latitude: ['latitude'],
      longitude: ['longitude']
    }

    // Find column indices
    const columnIndices: Record<string, number> = {}

    for (const [field, variations] of Object.entries(headerMappings)) {
      // First try exact match
      let index = headers.findIndex(header =>
        variations.some(variation => header === variation.toLowerCase())
      )
      
      // If no exact match found, try flexible matching for multi-word headers only
      if (index === -1) {
        index = headers.findIndex(header =>
          variations.some(variation => {
            // Only use includes() for multi-word variations (containing space or underscore)
            if (variation.includes(' ') || variation.includes('_')) {
              return header.includes(variation.toLowerCase())
            }
            return false
          })
        )
      }
      
      if (index !== -1) {
        columnIndices[field] = index
      }
    }

    // Validate that we can find the core required headers
    const coreRequiredFields = ['agent', 'dealerName', 'city', 'state']
    const missingFields = coreRequiredFields.filter(field => columnIndices[field] === undefined)

    if (missingFields.length > 0) {
      warnings.push(`Preview may be incomplete - missing core fields: ${missingFields.join(', ')}`)
    }

    // Parse rows and create preview data
    const parsedData: any[] = []

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      // Limit preview to 10 rows
      const row = rows[i]

      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue

      try {
        // Extract terminal from agent field (strip "TOMASEK-")
        const agent = row[columnIndices.agent]?.toString() || ''
        const terminal = agent.replace(/^TOMASEK-/i, '').trim()

        const data: any = {
          // Terminal data
          terminalName: terminal,
          terminalState: row[columnIndices.state]?.toString() || '',

          // Customer data
          dealerName: row[columnIndices.dealerName]?.toString() || '',
          cid: row[columnIndices.cid]?.toString() || '',
          city: row[columnIndices.city]?.toString() || '',
          state: row[columnIndices.state]?.toString() || '',
          zipCode: row[columnIndices.zipCode]?.toString() || '',
          latitude: row[columnIndices.latitude] ? parseFloat(row[columnIndices.latitude]) : null,
          longitude: row[columnIndices.longitude] ? parseFloat(row[columnIndices.longitude]) : null,
          dealerOpen: row[columnIndices.dealerOpen]?.toString() || '',
          dealerClose: row[columnIndices.dealerClose]?.toString() || '',

          // Route stop data
          routeNumber: row[columnIndices.routeNumber]?.toString() || '',
          eta: row[columnIndices.eta]?.toString() || '',
          etd: row[columnIndices.etd]?.toString() || '',
          fixedTime: row[columnIndices.fixedTime] ? parseInt(row[columnIndices.fixedTime]) : null,

          // Additional fields from Excel
          cube: row[columnIndices.cube] ? parseFloat(row[columnIndices.cube]) : null,
          deliveryXDock: row[columnIndices.deliveryXDock]?.toString() || '',
          specialEq: row[columnIndices.specialEq]?.toString() || '',
          lanterID: row[columnIndices.lanterID]?.toString() || '',
          facingPDC: row[columnIndices.facingPDC]?.toString() || '',
          geoResult: row[columnIndices.geoResult]?.toString() || ''
        }

        // Validate required fields
        if (!data.dealerName || !data.city || !data.state) {
          warnings.push(`Row ${i + 2}: Missing required dealer information, skipped`)
          continue
        }

        parsedData.push(data)
      } catch (error) {
        warnings.push(`Row ${i + 2}: Error parsing data - ${error}`)
        continue
      }
    }

    return { data: parsedData, warnings }
  }

  private parseLanterEndpointsExcel(buffer: Buffer): { data: any[]; warnings: string[]; importSummary: any } {
    // Parse multi-sheet Excel workbook
    const multiSheetResult = this.parseMultiSheetExcel(buffer)
    return multiSheetResult
  }

  private parseMultiSheetExcel(buffer: Buffer): { data: any[]; warnings: string[]; importSummary: any } {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file')
    }

    const warnings: string[] = []
    let routesData: any[] = []
    let terminalsUpdates: any[] = []
    let driversData: any[] = []
    let totalUniqueTerminals = new Set<string>()
    let totalUniqueCustomers = new Set<string>()
    let totalUniqueRoutes = new Set<string>()

    // Check for Routes sheet
    const routesSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'routes')

    if (routesSheetName) {
      const routesResult = this.parseRoutesSheet(workbook.Sheets[routesSheetName])
      routesData = routesResult.data
      warnings.push(...routesResult.warnings)

      // Use the statistics returned from parseRoutesSheet
      if (routesResult.uniqueTerminals) {
        routesResult.uniqueTerminals.forEach(terminal => totalUniqueTerminals.add(terminal))
      }
      if (routesResult.uniqueCustomers) {
        routesResult.uniqueCustomers.forEach(customer => totalUniqueCustomers.add(customer))
      }
      if (routesResult.uniqueRoutes) {
        routesResult.uniqueRoutes.forEach(route => totalUniqueRoutes.add(route))
      }
    } else {
      warnings.push('Routes sheet not found - no route data will be imported')
    }

    // Check for Terminals sheet (previously called Hubs)
    const terminalsSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'terminals')

    if (terminalsSheetName) {
      const terminalsResult = this.parseTerminalsSheet(workbook.Sheets[terminalsSheetName])
      terminalsUpdates = terminalsResult.data
      warnings.push(...terminalsResult.warnings)
    } else {
      warnings.push('Terminals sheet not found - no terminal updates will be applied')
    }

    // Check for ADL sheet (driver data)
    const adlSheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'adl')

    if (adlSheetName) {
      const driversResult = this.parseDriversSheet(workbook.Sheets[adlSheetName])
      driversData = driversResult.data
      warnings.push(...driversResult.warnings)
    } else {
      warnings.push('ADL sheet not found - no driver data will be imported')
    }

    // Create import summary
    const importSummary = {
      totalRows: routesData.length,
      sheets: {
        routes: {
          found: !!routesSheetName,
          rows: routesData.length,
          icon: 'mdi-table',
          description: 'Route stop data'
        },
        terminals: {
          found: !!terminalsSheetName,
          rows: terminalsUpdates.length,
          icon: 'mdi-table',
          description: 'Terminal and hub update data'
        },
        adl: {
          found: !!adlSheetName,
          rows: driversData.length,
          icon: 'mdi-table',
          description: 'Driver information (ADL)'
        }
      },
      terminals: {
        count: totalUniqueTerminals.size,
        updates: terminalsUpdates.length,
        icon: 'mdi-office-building',
        description: 'Terminal locations (created from Routes + updated from Terminals sheet)'
      },
      customers: {
        count: totalUniqueCustomers.size,
        icon: 'mdi-account-group',
        description: 'Customer destinations'
      },
      routes: {
        count: totalUniqueRoutes.size,
        icon: 'mdi-map-marker-path',
        description: 'Route definitions'
      },
      routeStops: {
        count: routesData.length,
        icon: 'mdi-map-marker-check',
        description: 'Individual route stops'
      },
      drivers: {
        count: driversData.length,
        icon: 'mdi-account-hard-hat',
        description: 'Driver information and licenses'
      },
      warnings
    }

    // Store terminal updates and drivers data in importSummary for later use
    ;(importSummary as any).terminalUpdates = terminalsUpdates
    ;(importSummary as any).driversData = driversData

    // Return combined data for preview (first 10 rows from routes)
    return {
      data: routesData.slice(0, 10),
      warnings,
      importSummary
    }
  }

  private parseRoutesSheet(worksheet: XLSX.WorkSheet): {
    data: any[]
    warnings: string[]
    uniqueTerminals?: Set<string>
    uniqueCustomers?: Set<string>
    uniqueRoutes?: Set<string>
  } {
    let jsonData: any[][]

    try {
      // Convert to JSON with header row, using raw values to detect Excel time numbers
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true, // Return raw values including Excel time numbers
        defval: '' // Default value for empty cells
      }) as any[][]

      if (jsonData.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row')
      }
    } catch (error) {
      console.error('Error in parseLanterEndpointsExcel:', error)
      throw error
    }

    const headers = jsonData[0].map((header: string) => header?.toString().toLowerCase().trim())
    const rows = jsonData.slice(1)
    const warnings: string[] = []

    // Header mapping for Lanter endpoints data - maps our field names to possible header variations
    const headerMappings = {
      trkid: ['trkid'],
      agent: ['agent'],
      cid: ['cid'],
      custname: ['custname'],
      address: ['address'],
      city: ['city'],
      st: ['st'],
      zip: ['zip'],
      timezone: ['time zone', 'timezone'],
      eta: ['eta'],
      etd: ['etd'],
      committime: ['committime'],
      ftime: ['ftime'],
      cube: ['cube'],
      opentime: ['opentime'],
      closetime: ['closetime'],
      hub: ['terminal'],
      lanter_id: ['lanter_id', 'lanter id'],
      customer_pdc: ['customer_pdc', 'customer pdc'],
      latitude: ['latitude'],
      longitude: ['longitude'],
      georesult: ['georesult'],
      legnumber: ['legnumber', 'leg number'],
      seq: ['seq']
    }

    // Find column indices using exact matching first, then flexible matching
    const columnIndices: Record<string, number> = {}
    for (const [fieldName, variations] of Object.entries(headerMappings)) {
      // First try exact match
      let index = headers.findIndex(header =>
        variations.some(variation => header === variation.toLowerCase())
      )
      
      // If no exact match found, try flexible matching for multi-word headers only
      if (index === -1) {
        index = headers.findIndex(header =>
          variations.some(variation => {
            // Only use includes() for multi-word variations (containing space or underscore)
            if (variation.includes(' ') || variation.includes('_')) {
              return header.includes(variation.toLowerCase())
            }
            return false
          })
        )
      }
      
      if (index !== -1) {
        columnIndices[fieldName] = index
      }
    }


    // Validate core required headers
    const coreRequiredFields = ['trkid', 'agent', 'cid', 'custname', 'city', 'st']
    const missingFields = coreRequiredFields.filter(field => columnIndices[field] === undefined)

    if (missingFields.length > 0) {
      warnings.push(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Parse rows and analyze data
    const parsedData: any[] = []
    const routesUniqueTerminals = new Set<string>()
    const routesUniqueCustomers = new Set<string>()
    const routesUniqueRoutes = new Set<string>()


    for (let i = 0; i < rows.length; i++) {
      // Show progress every 100 rows for large datasets
      if (i > 0 && i % 100 === 0) {
      }
      const row = rows[i]

      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue

      try {
        const trkid = row[columnIndices.trkid]?.toString().trim() || ''
        const agent = row[columnIndices.agent]?.toString().trim() || ''
        const cid = row[columnIndices.cid]?.toString().trim() || ''
        const custname = row[columnIndices.custname]?.toString().trim() || ''

        // Store raw time values for processing (detailed logging disabled for performance)
        const rawETA = row[columnIndices.eta]
        const rawETD = row[columnIndices.etd]
        const rawCommitTime = row[columnIndices.committime]
        const rawOpenTime = row[columnIndices.opentime]
        const rawCloseTime = row[columnIndices.closetime]

        // Track terminals using full agent (no splitting)
        if (agent) {
          routesUniqueTerminals.add(agent)
        }

        // Track unique customers
        if (cid && custname) {
          routesUniqueCustomers.add(cid)
        }

        // Track unique routes
        if (trkid) {
          routesUniqueRoutes.add(trkid)
        }

        // Parse time values (detailed logging disabled for performance)
        const parsedETA = this.parseTimeValue(row[columnIndices.eta])
        const parsedETD = this.parseTimeValue(row[columnIndices.etd])
        const parsedCommitTime = this.parseTimeValue(row[columnIndices.committime])
        const parsedOpenTime = this.parseTimeValue(row[columnIndices.opentime])
        const parsedCloseTime = this.parseTimeValue(row[columnIndices.closetime])

        // Basic data structure for preview
        const data: any = {
          trkid,
          agent,
          cid,
          custname,
          address: row[columnIndices.address]?.toString().trim() || '',
          city: row[columnIndices.city]?.toString().trim() || '',
          state: row[columnIndices.st]?.toString().trim() || '',
          zipCode: row[columnIndices.zip]?.toString().trim() || '',
          eta: parsedETA,
          etd: parsedETD,
          commitTime: parsedCommitTime,
          fixedTime: row[columnIndices.ftime]
            ? isNaN(parseFloat(row[columnIndices.ftime]))
              ? undefined
              : parseFloat(row[columnIndices.ftime])
            : undefined,
          cube: row[columnIndices.cube]
            ? isNaN(parseFloat(row[columnIndices.cube]))
              ? undefined
              : parseFloat(row[columnIndices.cube])
            : undefined,
          timeZone: row[columnIndices.timezone]?.toString().trim() || '',
          openTime: parsedOpenTime,
          closeTime: parsedCloseTime,
          hub: row[columnIndices.hub]?.toString().trim() || '',
          lanterID: row[columnIndices.lanter_id]?.toString().trim() || '',
          customerPDC: row[columnIndices.customer_pdc]?.toString().trim() || '',
          latitude: row[columnIndices.latitude]
            ? isNaN(parseFloat(row[columnIndices.latitude]))
              ? undefined
              : parseFloat(row[columnIndices.latitude])
            : undefined,
          longitude: row[columnIndices.longitude]
            ? isNaN(parseFloat(row[columnIndices.longitude]))
              ? undefined
              : parseFloat(row[columnIndices.longitude])
            : undefined,
          geoResult: row[columnIndices.georesult]?.toString().trim() || '',
          sequence: row[columnIndices.seq]
            ? isNaN(parseInt(row[columnIndices.seq]))
              ? 0
              : parseInt(row[columnIndices.seq])
            : 0
        }

        parsedData.push(data)
      } catch (error) {
        warnings.push(`Row ${i + 2}: Error parsing data - ${error}`)
        continue
      }
    }

    return {
      data: parsedData,
      warnings,
      uniqueTerminals: routesUniqueTerminals,
      uniqueCustomers: routesUniqueCustomers,
      uniqueRoutes: routesUniqueRoutes
    }
  }

  private parseTerminalsSheet(worksheet: XLSX.WorkSheet): { data: any[]; warnings: string[] } {
    let jsonData: any[][]

    try {
      // Convert to JSON with header row
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false, // Use formatted values for terminals sheet
        defval: '' // Default value for empty cells
      }) as any[][]

      if (jsonData.length < 2) {
        throw new Error('Terminals sheet must contain at least a header row and one data row')
      }
    } catch (error) {
      console.error('Error in parseTerminalsSheet:', error)
      throw error
    }

    const headers = jsonData[0].map((header: string) => header?.toString().toLowerCase().trim())
    const rows = jsonData.slice(1)
    const warnings: string[] = []

    // Header mapping for Terminals sheet - maps our field names to exact column headers
    const headerMappings = {
      terminal: ['terminal'],
      city: ['city'],
      state: ['state'],
      streetaddress: ['street address'],
      streetaddress2: ['street address 2'],
      zip: ['zip'],
      country: ['country'],
      fulladdress: ['full address'],
      worklist: ['worklist'],
      group: ['group'],  // Group column to identify terminals vs hubs
      latitude: ['latitude'],
      longitude: ['longitude']
      // Explicitly excluding 'notes' and 'gps' as requested
    }

    // Find column indices using exact matching first, then flexible matching
    const columnIndices: Record<string, number> = {}
    for (const [fieldName, variations] of Object.entries(headerMappings)) {
      // First try exact match
      let index = headers.findIndex(header =>
        variations.some(variation => header === variation.toLowerCase())
      )
      
      // If no exact match found, try flexible matching for multi-word headers only
      if (index === -1) {
        index = headers.findIndex(header =>
          variations.some(variation => {
            // Only use includes() for multi-word variations (containing space or underscore)
            if (variation.includes(' ') || variation.includes('_')) {
              return header.includes(variation.toLowerCase())
            }
            return false
          })
        )
      }
      
      if (index !== -1) {
        columnIndices[fieldName] = index
      }
    }

    // Validate that we can find core required headers
    const coreRequiredFields = ['terminal']
    const missingFields = coreRequiredFields.filter(field => columnIndices[field] === undefined)

    if (missingFields.length > 0) {
      warnings.push(`Missing required fields in Terminals sheet: ${missingFields.join(', ')}`)
    }

    // Parse rows and create terminal update data
    const parsedData: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue

      try {
        const terminalName = row[columnIndices.terminal]?.toString().trim() || ''

        if (!terminalName) {
          warnings.push(`Row ${i + 2}: Missing terminal name, skipped`)
          continue
        }

        // Create terminal update object with available fields
        const terminalUpdate: any = {
          name: terminalName,
          cName: this.generateCompliantName(terminalName)
        }

        // Check for Group column to determine if terminal or hub
        if (columnIndices.group !== undefined && row[columnIndices.group]) {
          terminalUpdate.group = row[columnIndices.group].toString().trim()
          terminalUpdate.terminalType = 'terminal'  // Has a group = terminal
        } else {
          terminalUpdate.terminalType = 'hub'  // No group = hub
        }

        // Add city and state if they exist in the Terminals sheet
        if (columnIndices.city !== undefined && row[columnIndices.city]) {
          terminalUpdate.city = row[columnIndices.city].toString().trim()
        }

        if (columnIndices.state !== undefined && row[columnIndices.state]) {
          terminalUpdate.state = row[columnIndices.state].toString().trim()
        }

        if (columnIndices.fulladdress !== undefined && row[columnIndices.fulladdress]) {
          const fullAddress = row[columnIndices.fulladdress].toString().trim()
          terminalUpdate.cName = this.generateCompliantName(fullAddress)
        }

        // Store additional fields that might be useful but aren't in the main terminal schema
        if (columnIndices.streetaddress !== undefined && row[columnIndices.streetaddress]) {
          terminalUpdate.streetAddress = row[columnIndices.streetaddress].toString().trim()
        }

        if (columnIndices.streetaddress2 !== undefined && row[columnIndices.streetaddress2]) {
          terminalUpdate.streetAddress2 = row[columnIndices.streetaddress2].toString().trim()
        }

        if (columnIndices.zip !== undefined && row[columnIndices.zip]) {
          terminalUpdate.zipCode = row[columnIndices.zip].toString().trim()
        }

        if (columnIndices.country !== undefined && row[columnIndices.country]) {
          terminalUpdate.country = row[columnIndices.country].toString().trim()
        }

        if (columnIndices.worklist !== undefined && row[columnIndices.worklist]) {
          terminalUpdate.worklist = row[columnIndices.worklist].toString().trim()
        }

        if (columnIndices.latitude !== undefined && row[columnIndices.latitude]) {
          const lat = parseFloat(row[columnIndices.latitude])
          if (!isNaN(lat)) terminalUpdate.latitude = lat
        }

        if (columnIndices.longitude !== undefined && row[columnIndices.longitude]) {
          const lng = parseFloat(row[columnIndices.longitude])
          if (!isNaN(lng)) terminalUpdate.longitude = lng
        }

        parsedData.push(terminalUpdate)
      } catch (error) {
        warnings.push(`Row ${i + 2}: Error parsing terminal data - ${error}`)
        continue
      }
    }

    return { data: parsedData, warnings }
  }

  private analyzeWorksheets(buffer: Buffer): any {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetNames = workbook.SheetNames

    // Expected headers for each worksheet
    // const expectedHeaders = {
    //   'Terminals': [
    //     'Terminal', 'City', 'State', 'Street Address', 'Street Address 2',
    //     'Zip', 'Country', 'Full Address', 'Worklist', 'GPS',
    //     'Latitude', 'Longitude', 'Notes'
    //   ],
    //   'Routes': [
    //     'Agent', 'RouteNumber', 'CID', 'Dealer Name', 'City', 'ST', 'Zip',
    //     'ETA', 'ETD', 'Fixed Time', 'Cube', 'Open', 'Close',
    //     'Delivery X-Dock', 'Special Eq', 'Lanter ID', 'Facing PDC',
    //     'LATITUDE', 'LONGITUDE', 'GEORESULT'
    //   ],
    //   'ADL': [
    //     'First Name', 'Last Name', 'DOB', 'License Number', 'License State',
    //     'Drivers License Type', 'License Type', 'Status', 'Worklist',
    //     'Operating Authority', 'Driver Status', 'Hire Date', 'Termination Date',
    //     'Rehire Date', 'Worker Classification', 'Primary Phone', 'Driver ID',
    //     'GEOtab', 'License Exp Date'
    //   ],
    //   'DriverBoard': [
    //     'Terminal', 'TRKID', 'ABS / Specials', 'Route Pay', 'Truck', 'Phone',
    //     'Driver Name', 'ETD', 'Totals', 'Sunday', 'Monday', 'Tuesday',
    //     'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Extra/Specials',
    //     'Comments (who is filling open route, etc)'
    //   ]
    // }
    const expectedHeaders = {
      Terminals: [
        'Terminal',
        'City',
        'State',
        'Street Address',
        'Street Address 2',
        'Zip',
        'Country',
        'Worklist',
        'Latitude',
        'Longitude'
      ],
      Routes: [
        'Agent',
        'RouteNumber',
        'CID',
        'Dealer Name',
        'City',
        'ST',
        'Zip',
        'ETA',
        'ETD',
        'Open',
        'Close',
        'Delivery X-Dock',
        'Lanter ID',
        'LATITUDE',
        'LONGITUDE'
      ],
      ADL: [
        'First Name',
        'Last Name',
        'DOB',
        'License Number',
        'License State',
        'Drivers License Type',
        'License Type',
        'Status',
        'Worklist',
        'Operating Authority',
        'Driver Status',
        'Hire Date',
        'Termination Date',
        'Rehire Date',
        'Worker Classification',
        'Primary Phone',
        'Driver ID',
        'GEOtab',
        'License Exp Date'
      ],
      DriverBoard: [
        'RouteNumber',
        'ABS-Specials',
        'Truck',
        'Driver Name',
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday'
      ]
    }

    // Expected worksheets with their descriptions and icons
    // Note: Terminals worksheet is excluded - we'll use Agent field from Routes to create terminals instead
    const expectedWorksheets = [
      {
        name: 'Routes',
        description: 'Route definitions and scheduling (Agent field used for terminals)',
        icon: 'mdi-map-marker-path',
        found: false,
        rowCount: 0,
        validHeaders: false,
        headerErrors: [] as string[],
        missingHeaders: [] as string[],
        extraHeaders: [] as string[]
      },
      {
        name: 'ADL',
        description: 'Additional data layer information',
        icon: 'mdi-database',
        found: false,
        rowCount: 0,
        validHeaders: false,
        headerErrors: [] as string[],
        missingHeaders: [] as string[],
        extraHeaders: [] as string[]
      },
      {
        name: 'DriverBoard',
        description: 'Driver assignments and board data',
        icon: 'mdi-account-hard-hat',
        found: false,
        rowCount: 0,
        validHeaders: false,
        headerErrors: [] as string[],
        missingHeaders: [] as string[],
        extraHeaders: [] as string[]
      }
    ]

    const warnings: string[] = []

    // Check each expected worksheet
    for (const worksheet of expectedWorksheets) {
      const sheetName = sheetNames.find(name => name.toLowerCase() === worksheet.name.toLowerCase())

      if (sheetName) {
        worksheet.found = true
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        // Count data rows (subtract 1 for header row, ensure minimum 0)
        worksheet.rowCount = Math.max(0, jsonData.length - 1)

        // Validate headers if worksheet has expected headers defined
        const expectedHeadersForSheet = expectedHeaders[worksheet.name as keyof typeof expectedHeaders]
        if (expectedHeadersForSheet && expectedHeadersForSheet.length > 0 && jsonData.length > 0) {
          const actualHeaders =
            jsonData[0]?.map((header: any) => header?.toString().trim() || '').filter(h => h !== '') || []

          // Check for missing headers
          const missingHeaders = expectedHeadersForSheet.filter(
            expected => !actualHeaders.some(actual => actual.toLowerCase() === expected.toLowerCase())
          )

          // Check for extra headers
          const extraHeaders = actualHeaders.filter(
            actual =>
              !expectedHeadersForSheet.some(expected => actual.toLowerCase() === expected.toLowerCase())
          )

          worksheet.missingHeaders = missingHeaders
          worksheet.extraHeaders = extraHeaders
          worksheet.validHeaders = missingHeaders.length === 0

          // Generate header error messages
          if (missingHeaders.length > 0) {
            worksheet.headerErrors.push(`Missing required headers: ${missingHeaders.join(', ')}`)
          }
          if (extraHeaders.length > 0) {
            worksheet.headerErrors.push(`Unexpected headers found: ${extraHeaders.join(', ')}`)
          }

          // Add to global warnings if headers are invalid
          if (!worksheet.validHeaders) {
            warnings.push(`Worksheet "${worksheet.name}" has header validation errors`)
          }
        } else if (expectedHeadersForSheet && expectedHeadersForSheet.length > 0) {
          // Worksheet exists but has no data rows
          worksheet.headerErrors.push('Worksheet appears to be empty or has no header row')
          warnings.push(`Worksheet "${worksheet.name}" appears to be empty`)
        } else {
          // This should not happen as all worksheets now have defined headers
          worksheet.validHeaders = false
          worksheet.headerErrors.push('No header validation defined for this worksheet')
        }
      } else {
        worksheet.found = false
        worksheet.rowCount = 0
        worksheet.validHeaders = false
        worksheet.headerErrors.push('Worksheet not found in Excel file')
        warnings.push(`Worksheet "${worksheet.name}" not found`)
      }
    }

    // Check for unexpected worksheets
    const expectedSheetNames = expectedWorksheets.map(w => w.name.toLowerCase())
    const unexpectedSheets = sheetNames.filter(name => !expectedSheetNames.includes(name.toLowerCase()))

    for (const unexpected of unexpectedSheets) {
      if (unexpected.toLowerCase() === 'terminals') {
        warnings.push(
          `"${unexpected}" worksheet found but will be skipped - terminals are created from Routes Agent field`
        )
      } else {
        warnings.push(`Unexpected worksheet found: "${unexpected}"`)
      }
    }

    return {
      totalSheets: sheetNames.length,
      worksheets: expectedWorksheets,
      warnings
    }
  }

  private parseDriversSheet(worksheet: XLSX.WorkSheet): { data: any[]; warnings: string[] } {
    let jsonData: any[][]

    try {
      // Convert to JSON with header row
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false, // Use formatted values for drivers sheet
        defval: '' // Default value for empty cells
      }) as any[][]

      if (jsonData.length < 2) {
        throw new Error('Drivers sheet must contain at least a header row and one data row')
      }
    } catch (error) {
      console.error('Error in parseDriversSheet:', error)
      throw error
    }

    const headers = jsonData[0].map((header: string) => header?.toString().toLowerCase().trim())
    const rows = jsonData.slice(1)
    const warnings: string[] = []

    // Header mapping for Drivers sheet - maps our field names to expected column headers
    const headerMappings = {
      firstName: ['first name'],
      lastName: ['last name'],
      dob: ['dob'],
      licenseNumber: ['license number'],
      licenseState: ['license state'],
      driversLicenseType: ['drivers license type'],
      licenseType: ['license type'],
      status: ['status'],
      worklist: ['worklist'],
      operatingAuthority: ['operating authority'],
      driverStatus: ['driver status'],
      hireDate: ['hire date'],
      terminationDate: ['termination date'],
      rehireDate: ['rehire date'],
      workerClassification: ['worker classification'],
      primaryPhone: ['primary phone'],
      driverId: ['driver id'],
      geotab: ['geotab'],
      licenseExpDate: ['license exp date'],
      drivingExperience: ['driving experience'],
      cdlDrivingExperience: ['cdl driving experience'],
      totalYearsExperience: ['total number of years of driving experience']
    }

    // Find column indices using exact matching first, then flexible matching
    const columnIndices: Record<string, number> = {}
    for (const [fieldName, variations] of Object.entries(headerMappings)) {
      // First try exact match
      let index = headers.findIndex(header =>
        variations.some(variation => header === variation.toLowerCase())
      )
      
      // If no exact match found, try flexible matching for multi-word headers only
      if (index === -1) {
        index = headers.findIndex(header =>
          variations.some(variation => {
            // Only use includes() for multi-word variations (containing space or underscore)
            if (variation.includes(' ') || variation.includes('_')) {
              return header.includes(variation.toLowerCase())
            }
            return false
          })
        )
      }
      
      if (index !== -1) {
        columnIndices[fieldName] = index
      }
    }

    // Validate that we can find core required headers
    const coreRequiredFields = ['firstName', 'lastName']
    const missingFields = coreRequiredFields.filter(field => columnIndices[field] === undefined)

    if (missingFields.length > 0) {
      warnings.push(`Missing required fields in Drivers sheet: ${missingFields.join(', ')}`)
    }

    // Parse rows and create driver data
    const parsedData: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue

      try {
        const firstName = row[columnIndices.firstName]?.toString().trim() || ''
        const lastName = row[columnIndices.lastName]?.toString().trim() || ''

        if (!firstName || !lastName) {
          warnings.push(`Row ${i + 2}: Missing first name or last name, skipped`)
          continue
        }

        // Create driver object with available fields
        const driverData: any = {
          firstName,
          lastName
        }

        // Add optional fields if they exist and have values
        if (columnIndices.dob !== undefined && row[columnIndices.dob]) {
          driverData.dob = row[columnIndices.dob].toString().trim()
        }

        if (columnIndices.licenseNumber !== undefined && row[columnIndices.licenseNumber]) {
          driverData.licenseNumber = row[columnIndices.licenseNumber].toString().trim()
        }

        if (columnIndices.licenseState !== undefined && row[columnIndices.licenseState]) {
          driverData.licenseState = row[columnIndices.licenseState].toString().trim()
        }

        if (columnIndices.driversLicenseType !== undefined && row[columnIndices.driversLicenseType]) {
          driverData.driversLicenseType = row[columnIndices.driversLicenseType].toString().trim()
        }

        if (columnIndices.licenseType !== undefined && row[columnIndices.licenseType]) {
          driverData.licenseType = row[columnIndices.licenseType].toString().trim()
        }

        if (columnIndices.status !== undefined && row[columnIndices.status]) {
          driverData.status = row[columnIndices.status].toString().trim()
        }

        if (columnIndices.worklist !== undefined && row[columnIndices.worklist]) {
          driverData.worklist = row[columnIndices.worklist].toString().trim()
        }

        if (columnIndices.operatingAuthority !== undefined && row[columnIndices.operatingAuthority]) {
          driverData.operatingAuthority = row[columnIndices.operatingAuthority].toString().trim()
        }

        if (columnIndices.driverStatus !== undefined && row[columnIndices.driverStatus]) {
          driverData.driverStatus = row[columnIndices.driverStatus].toString().trim()
        }

        if (columnIndices.hireDate !== undefined && row[columnIndices.hireDate]) {
          driverData.hireDate = row[columnIndices.hireDate].toString().trim()
        }

        if (columnIndices.terminationDate !== undefined && row[columnIndices.terminationDate]) {
          driverData.terminationDate = row[columnIndices.terminationDate].toString().trim()
        }

        if (columnIndices.rehireDate !== undefined && row[columnIndices.rehireDate]) {
          driverData.rehireDate = row[columnIndices.rehireDate].toString().trim()
        }

        if (columnIndices.workerClassification !== undefined && row[columnIndices.workerClassification]) {
          driverData.workerClassification = row[columnIndices.workerClassification].toString().trim()
        }

        if (columnIndices.primaryPhone !== undefined && row[columnIndices.primaryPhone]) {
          driverData.primaryPhone = row[columnIndices.primaryPhone].toString().trim()
        }

        if (columnIndices.driverId !== undefined && row[columnIndices.driverId]) {
          driverData.driverId = row[columnIndices.driverId].toString().trim()
        }

        if (columnIndices.geotab !== undefined && row[columnIndices.geotab]) {
          driverData.geotab = row[columnIndices.geotab].toString().trim()
        }

        if (columnIndices.licenseExpDate !== undefined && row[columnIndices.licenseExpDate]) {
          driverData.licenseExpDate = row[columnIndices.licenseExpDate].toString().trim()
        }

        if (columnIndices.drivingExperience !== undefined && row[columnIndices.drivingExperience]) {
          driverData.drivingExperience = row[columnIndices.drivingExperience].toString().trim()
        }

        if (columnIndices.cdlDrivingExperience !== undefined && row[columnIndices.cdlDrivingExperience]) {
          driverData.cdlDrivingExperience = row[columnIndices.cdlDrivingExperience].toString().trim()
        }

        if (columnIndices.totalYearsExperience !== undefined && row[columnIndices.totalYearsExperience]) {
          const years = parseFloat(row[columnIndices.totalYearsExperience])
          if (!isNaN(years)) driverData.totalYearsExperience = years
        }

        parsedData.push(driverData)
      } catch (error) {
        warnings.push(`Row ${i + 2}: Error parsing driver data - ${error}`)
        continue
      }
    }

    return { data: parsedData, warnings }
  }

  private parseDriverBoardExcel(buffer: Buffer): { data: any[]; warnings: string[]; importSummary: any } {
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No worksheets found in Excel file')
    }

    const warnings: string[] = []
    let driverBoardData: any[] = []
    let terminalSupervisorData: any[] = []
    let totalRouteUpdates = 0
    let totalEquipmentEntries = 0
    let totalFleetEntries = 0
    let totalBenchDrivers = 0
    let totalLeaders = 0
    const unmatchedItems: string[] = []

    // Find all DB- prefixed sheets
    const driverBoardSheets = workbook.SheetNames.filter(name => name.toUpperCase().startsWith('DB-'))
    
    // Find SUP-Terminal sheet
    const supTerminalSheet = workbook.SheetNames.find(name => name.toUpperCase() === 'SUP-TERMINAL')

    if (driverBoardSheets.length === 0) {
      warnings.push('No driver board sheets found (sheets should start with "DB-")')
    } else {

      for (const sheetName of driverBoardSheets) {
        const sheetResult = this.parseDriverBoardSheet(workbook.Sheets[sheetName], sheetName)
        driverBoardData.push(...sheetResult.data)
        warnings.push(...sheetResult.warnings)
        totalRouteUpdates += sheetResult.routeUpdates
        totalEquipmentEntries += sheetResult.equipmentEntries
        totalFleetEntries += sheetResult.fleetEntries || 0
        unmatchedItems.push(...sheetResult.unmatchedItems)
      }
    }

    // Process SUP-Terminal sheet if found
    if (supTerminalSheet) {
      const terminalResult = this.parseTerminalSupervisorSheet(workbook.Sheets[supTerminalSheet])
      terminalSupervisorData = terminalResult.data
      warnings.push(...terminalResult.warnings)
      totalBenchDrivers = terminalResult.data.filter(s => s.isBenchDriver).length
      totalLeaders = terminalResult.data.filter(s => !s.isBenchDriver).length
    } else {
      warnings.push('SUP-Terminal sheet not found - no terminal supervisors will be imported')
    }

    // Create import summary
    const importSummary = {
      totalRows: driverBoardData.length + terminalSupervisorData.length,
      sheets: [
        ...driverBoardSheets.map(name => ({
          name,
          found: true,
          rows: driverBoardData.filter(item => item.sheetName === name).length,
          icon: 'mdi-table',
          description: `Driver board assignments from ${name}`
        })),
        ...(supTerminalSheet ? [{
          name: 'SUP-Terminal',
          found: true,
          rows: terminalSupervisorData.length,
          icon: 'mdi-account-supervisor',
          description: `Terminal supervisors and bench drivers`
        }] : [])
      ],
      routeAssignments: {
        count: totalRouteUpdates,
        icon: 'mdi-truck-fast',
        description: 'Route assignments with truck and driver info'
      },
      equipment: {
        count: totalEquipmentEntries,
        icon: 'mdi-truck',
        description: 'Equipment entries (trucks and sub-units)'
      },
      fleet: {
        count: totalFleetEntries,
        icon: 'mdi-truck-fast',
        description: 'Fleet vehicle entries with terminal assignments'
      },
      benchDrivers: {
        count: totalBenchDrivers,
        icon: 'mdi-account-hard-hat',
        description: 'Drivers to be added to terminal bench'
      },
      leaders: {
        count: totalLeaders,
        icon: 'mdi-account-star',
        description: 'Terminal operators and staff'
      },
      unmatchedItems: {
        count: unmatchedItems.length,
        icon: 'mdi-alert-circle',
        description: 'Routes or drivers that could not be matched',
        items: unmatchedItems
      },
      warnings
    }

    return {
      data: driverBoardData.slice(0, 10), // Limit preview to first 10 rows
      warnings,
      importSummary
    }
  }

  private parseDriverBoardSheet(worksheet: XLSX.WorkSheet, sheetName: string): { 
    data: any[]; 
    warnings: string[]; 
    routeUpdates: number;
    equipmentEntries: number;
    fleetEntries: number;
    unmatchedItems: string[];
  } {
    let jsonData: any[][]

    try {
      // Convert to JSON with header row
      jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: ''
      }) as any[][]

      if (jsonData.length < 2) {
        throw new Error(`Driver board sheet ${sheetName} must contain at least a header row and one data row`)
      }
    } catch (error) {
      console.error(`Error in parseDriverBoardSheet for ${sheetName}:`, error)
      throw error
    }

    const headers = jsonData[0].map((header: string) => header?.toString().toLowerCase().trim())
    const rows = jsonData.slice(1)
    const warnings: string[] = []
    const unmatchedItems: string[] = []

    // Header mapping for driver board sheets
    const headerMappings = {
      route: ['route'],
      driver: ['driver'],
      fuelCard: ['fuel card', 'fuelcard'],
      truckNumber: ['truck #', 'truck number', 'truck'],
      subUnit: ['sub unit', 'subunit', 'sub-unit'],
      truckType: ['truck type', 'trucktype'],
      truckStatus: ['truck status', 'truckstatus'],
      scanner: ['scanner'],
      departureTime: ['departure time', 'departuretime', 'departure']
    }

    // Find column indices using exact matching first, then flexible matching
    const columnIndices: Record<string, number> = {}
    for (const [fieldName, variations] of Object.entries(headerMappings)) {
      // First try exact match
      let index = headers.findIndex(header =>
        variations.some(variation => header === variation.toLowerCase())
      )
      
      // If no exact match found, try flexible matching for multi-word headers only
      if (index === -1) {
        index = headers.findIndex(header =>
          variations.some(variation => {
            // Only use includes() for multi-word variations (containing space or underscore)
            if (variation.includes(' ') || variation.includes('_')) {
              return header.includes(variation.toLowerCase())
            }
            return false
          })
        )
      }
      
      if (index !== -1) {
        columnIndices[fieldName] = index
      }
    }

    // Validate that we can find core required headers
    const coreRequiredFields = ['route']
    const missingFields = coreRequiredFields.filter(field => columnIndices[field] === undefined)

    if (missingFields.length > 0) {
      warnings.push(`Missing required fields in ${sheetName}: ${missingFields.join(', ')}`)
    }

    // Parse rows and create driver board data
    const parsedData: any[] = []
    let routeUpdates = 0
    let equipmentEntries = 0
    let fleetEntries = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue

      try {
        const routeValue = row[columnIndices.route]?.toString().trim() || ''
        const driverValue = row[columnIndices.driver]?.toString().trim() || ''
        const fuelCardValue = row[columnIndices.fuelCard]?.toString().trim() || ''
        const truckNumberValue = row[columnIndices.truckNumber]?.toString().trim() || ''
        const subUnitValue = row[columnIndices.subUnit]?.toString().trim() || ''
        const truckTypeValue = row[columnIndices.truckType]?.toString().trim() || ''
        const truckStatusValue = row[columnIndices.truckStatus]?.toString().trim() || ''
        const scannerValue = row[columnIndices.scanner]?.toString().trim() || ''
        const departureTimeValue = row[columnIndices.departureTime] ? this.parseTimeValue(row[columnIndices.departureTime]) : ''

        if (!routeValue) {
          warnings.push(`Row ${i + 2} in ${sheetName}: Missing route value, skipped`)
          continue
        }

        // Create driver board entry
        const driverBoardEntry: any = {
          sheetName,
          route: routeValue,
          driver: driverValue,
          fuelCard: fuelCardValue,
          truckNumber: truckNumberValue,
          subUnit: subUnitValue,
          truckType: truckTypeValue,
          truckStatus: truckStatusValue,
          scanner: scannerValue,
          departureTime: departureTimeValue
        }

        // Count potential updates
        if (routeValue) {
          routeUpdates++
        }

        // Count equipment entries
        if (truckNumberValue) {
          equipmentEntries++
          fleetEntries++ // Each truck will also create a fleet entry
        }
        if (subUnitValue) {
          equipmentEntries++
          fleetEntries++ // Each sub-unit will also create a fleet entry
        }

        parsedData.push(driverBoardEntry)
      } catch (error) {
        warnings.push(`Row ${i + 2} in ${sheetName}: Error parsing data - ${error}`)
        continue
      }
    }

    return { 
      data: parsedData, 
      warnings, 
      routeUpdates,
      equipmentEntries,
      fleetEntries,
      unmatchedItems
    }
  }

  private parseTerminalSupervisorSheet(worksheet: XLSX.WorkSheet): { 
    data: any[]; 
    warnings: string[];
  } {
    const warnings: string[] = []
    const parsedData: any[] = []

    try {
      // Convert worksheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

      if (jsonData.length === 0) {
        warnings.push('SUP-Terminal sheet is empty')
        return { data: parsedData, warnings }
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

          parsedData.push({
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

    return { data: parsedData, warnings }
  }
}
