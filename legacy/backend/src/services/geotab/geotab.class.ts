// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services
import type { Params } from '@feathersjs/feathers'
import { MongoDBService } from '@feathersjs/mongodb'
import type { MongoDBAdapterParams, MongoDBAdapterOptions } from '@feathersjs/mongodb'

import type { Application } from '../../declarations'
import type { Geotab, GeotabData, GeotabPatch, GeotabQuery, GeotabAuth } from './geotab.schema'
const GeotabApi = require('mg-api-js')

export const getOptions = (app: Application) => {
  return {
    paginate: app.get('paginate'),
    Model: app.get('mongodbClient').then(db => db.collection('geotab'))
  }
}

export type { Geotab, GeotabData, GeotabPatch, GeotabQuery, GeotabAuth }

export interface GeotabParams extends MongoDBAdapterParams<GeotabQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class GeotabService<ServiceParams extends Params = GeotabParams> extends MongoDBService<
  Geotab,
  GeotabData,
  GeotabParams,
  GeotabPatch
> {
  app: any
  private memoryAuth: { database: string, username: string, password: string } | null = null
  private fleetDataCache: { data: any[], timestamp: Date } | null = null
  private pollingInterval: NodeJS.Timeout | null = null
  private isThrottled: boolean = false
  private throttledUntil: Date | null = null
  
  // In-memory storage for trip data by date
  private tripDataByDate = new Map<string, { trips: any[], version: string | null, lastUpdated: Date }>()
  
  // In-memory storage for driver data
  private driverDataCache: { drivers: any[], version: string | null, lastUpdated: Date } | null = null
  
  // In-memory storage for device data
  private deviceDataCache: { devices: any[], version: string | null, lastUpdated: Date } | null = null
  
  // In-memory storage for group data
  private groupDataCache: { groups: any[], version: string | null, lastUpdated: Date } | null = null

  constructor(options: MongoDBAdapterOptions, app?: any) {
    super(options)
    this.app = app
    
    // Start automatic polling if credentials are available
    // DISABLED: this.startAutomaticPolling()
  }

  // Authenticate with Geotab API using mg-api-js
  async authenticate(authData: GeotabAuth): Promise<{ 
    success: boolean, 
    sessionId?: string, 
    server?: string,
    error?: string 
  }> {
    try {
      // Create authentication object for mg-api-js
      const authentication = {
        credentials: {
          database: authData.database,
          userName: authData.username,
          password: authData.password
        },
        path: 'https://my.geotab.com'
      }

      // Add options like in working code
      const options = {
        rememberMe: true,
        timeout: 10
      }

      // Create API instance with options
      const api = new GeotabApi(authentication, options)
      
      // Use callback-based authentication like in working code
      return new Promise((resolve) => {
        api.authenticate(
          (success: any) => {
            // The credentials are in the success parameter, not on the api instance
            const credentials = success?.credentials
            const server = success?.path || 'https://my.geotab.com'
            
            if (credentials && credentials.sessionId) {
              // Store credentials in memory for automatic polling
              this.memoryAuth = {
                database: authData.database,
                username: authData.username || '',
                password: authData.password || ''
              }
              
              console.log('[GEOTAB] Credentials stored (automatic polling disabled)...')
              
              // Start automatic polling
              // DISABLED: this.startAutomaticPolling()
              
              resolve({
                success: true,
                sessionId: credentials.sessionId,
                server: server
              })
            } else {
              resolve({
                success: false,
                error: 'Invalid response from Geotab API - no valid credentials/sessionId'
              })
            }
          },
          (message: string, error: any) => {
            resolve({
              success: false,
              error: message || 'Authentication failed'
            })
          }
        )
      })
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Authentication failed'
      }
    }
  }

  // Get current authentication status - no longer storing auth data
  async getAuthStatus(): Promise<Geotab | null> {
    // Return null since we don't store authentication information anymore
    return null
  }

  // Check if current session is still valid - no longer applicable without stored data
  async isSessionValid(): Promise<boolean> {
    // Since we don't store auth data anymore, return false
    // Client needs to re-authenticate each session
    return false
  }

  // Logout from Geotab - clear memory auth and stop polling
  async logout(): Promise<boolean> {
    return await this.clearMemoryAuth()
  }

  // Test API call to verify session using mg-api-js
  async testConnection(): Promise<{ success: boolean, error?: string, version?: string }> {
    // Since we don't store credentials, we can't test stored connections
    return { 
      success: false, 
      error: 'No stored session - authentication required for each request' 
    }
  }

  // Get devices from Geotab (for fleet tracking)
  async getDevices(): Promise<{ success: boolean, devices?: any[], error?: string }> {
    // Since we don't store credentials, we can't fetch devices with stored sessions
    return { 
      success: false, 
      error: 'No stored session - authentication required for each request' 
    }
  }

  // Helper method for making Geotab API calls
  private async makeGeotabApiCall(method: string, params: any, authData: GeotabAuth): Promise<any> {
    if (!authData.password) {
      throw new Error('Password required for Geotab API calls')
    }

    const credentials = {
      database: authData.database,
      userName: authData.username,
      password: authData.password
    }

    const GeotabApi = require('mg-api-js')
    const authObj = {
      credentials: credentials,
      path: 'https://my.geotab.com'
    }
    const api = new GeotabApi(authObj, { rememberMe: false })

    return new Promise((resolve, reject) => {
      api.call(
        method, 
        params,
        (result: any) => {
          if (result && result.error) {
            reject(new Error(result.error.message || 'API call returned error'))
            return
          }
          resolve(result.result || result)
        },
        (error: any) => {
          reject(new Error(error.message || error.name || 'API call failed'))
        }
      )
    })
  }

  // Helper method for MultiCall API requests using mg-api-js multiCall method
  private async makeGeotabMultiCall(calls: any[], authData: GeotabAuth): Promise<any[]> {
    try {
      console.log(`Making MultiCall with ${calls.length} requests`)
      
      if (!authData.password) {
        throw new Error('Password required for Geotab MultiCall API calls')
      }
      
      const credentials = {
        database: authData.database,
        userName: authData.username,
        password: authData.password
      }
      const path = 'https://my.geotab.com'

      console.log('Creating API instance for MultiCall with credentials:', {
        database: credentials.database,
        userName: credentials.userName,
        hasPassword: !!credentials.password
      })

      // Import mg-api-js and create instance with password authentication structure 
      const GeotabApi = require('mg-api-js')
      
      const authObj = {
        credentials: {
          database: credentials.database,
          userName: credentials.userName,
          password: credentials.password
        },
        path: path
      }
      const api = new GeotabApi(authObj, { rememberMe: false })

      // Use the mg-api-js multiCall method with separate success and error callbacks
      return new Promise((resolve, reject) => {
        api.multiCall(
          calls,
          (result: any) => {
            // Success callback
            if (result && result.error) {
              console.error('Geotab MultiCall result error:', result.error)
              reject(new Error(result.error.message || 'MultiCall returned error'))
              return
            }
            console.log(`MultiCall returned ${result?.length || 0} results`)
            resolve(result || [])
          },
          (error: any) => {
            // Error callback
            console.error('Geotab MultiCall API error:', error)
            reject(new Error(error.message || error.name || 'MultiCall API call failed'))
          }
        )
      })
    } catch (error: any) {
      console.error('Error in makeGeotabMultiCall:', error)
      throw error
    }
  }

  // Helper method to get data with pagination
  private async getGeotabDataWithPagination(typeName: string, searchParams: any, authData: GeotabAuth): Promise<any[]> {
    const allData: any[] = []
    let fromVersion = 0

    try {
      while (true) {
        const params = {
          typeName,
          resultsLimit: 1000,
          ...searchParams
        }

        if (fromVersion > 0) {
          params.search = { ...(params.search || {}), fromVersion }
        }

        console.log(`Fetching ${typeName} data, fromVersion: ${fromVersion}`)
        const batch = await this.makeGeotabApiCall('Get', params, authData)
        
        if (!batch || batch.length === 0) {
          console.log(`No more ${typeName} data, stopping pagination`)
          break
        }

        allData.push(...batch)
        console.log(`Fetched ${batch.length} ${typeName} records, total: ${allData.length}`)

        // Update fromVersion for next iteration
        if (batch.length < 1000) {
          console.log(`Last batch for ${typeName}, stopping pagination`)
          break
        }

        // Get the highest version from this batch for next request
        const versions = batch.map((item: any) => item.version).filter((v: any) => v != null)
        if (versions.length > 0) {
          fromVersion = Math.max(...versions)
        } else {
          break
        }
      }

      console.log(`Completed ${typeName} pagination: ${allData.length} total records`)
      return allData
    } catch (error: any) {
      console.error(`Error in getGeotabDataWithPagination for ${typeName}:`, error)
      throw error
    }
  }

  // Get real-time fleet information using simple Device and DeviceStatusInfo calls
  async getRealTimeFleetInfo(authData: GeotabAuth, skipSnapshot: boolean = false): Promise<{
    success: boolean,
    deviceData?: any[],
    deviceStatusData?: any[],
    userData?: any[],
    combinedData?: any[],
    error?: string
  }> {
    try {
      // Check if we're currently throttled
      if (this.checkThrottleStatus()) {
        return {
          success: false,
          error: 'GEOTAB_THROTTLED: API temporarily unavailable due to rate limiting. Please wait.'
        }
      }
      console.log('[REALTIME] Starting Device, DeviceStatusInfo, and User lookup...')
      
      // Check if we should use stored credentials or provided credentials
      let actualAuthData = { ...authData }
      
      if (authData.password === 'from_memory') {
        // Use stored credentials from memory
        if (!this.memoryAuth || !this.memoryAuth.password) {
          throw new Error('No stored password available. Please re-authenticate.')
        }
        actualAuthData.password = this.memoryAuth.password
        console.log('[GEOTAB] Using stored password from memory for real-time fleet data')
      }
      
      // First call: Get all Device records
      const deviceData = await this.makeGeotabApiCall('Get', {
        typeName: 'Device',
        propertySelector: {
          fields: [ "name", "id" ]
        }
      }, actualAuthData)

      // Second call: Get all DeviceStatusInfo records  
      const deviceStatusData = await this.makeGeotabApiCall('Get', {
        typeName: 'DeviceStatusInfo',
        propertySelector: {
          fields: ["device", "driver", 'isDriving', 'latitude', 'longitude', 'speed',  'dateTime', 'bearing']
        }
      }, actualAuthData)

      // Third call: Get all User records (drivers)
      const userData = await this.makeGeotabApiCall('Get', {
        typeName: 'User',
        propertySelector: {
          fields: ['firstName', 'lastName', 'name', 'employeeNo', 'id']
        }
      }, actualAuthData)

      // Create maps for quick lookup
      const deviceMap = new Map()
      if (deviceData) {
        deviceData.forEach((device: any) => {
          deviceMap.set(device.id, device)
        })
      }

      const userMap = new Map()
      if (userData) {
        userData.forEach((user: any) => {
          userMap.set(user.id, user)
        })
      }

      // Combine deviceStatusData with matching device and user information
      const combinedData: any[] = []
      if (deviceStatusData) {
        deviceStatusData.forEach((statusInfo: any) => {
          const deviceId = statusInfo.device?.id
          const deviceInfo = deviceId ? deviceMap.get(deviceId) : null
          const driverId = statusInfo.driver?.id
          const driverInfo = driverId ? userMap.get(driverId) : null
          
          combinedData.push({
            deviceId: deviceId,
            deviceName: deviceInfo?.name || 'Unknown Device',
            latitude: statusInfo.latitude,
            longitude: statusInfo.longitude,
            speed: statusInfo.speed,
            bearing: statusInfo.bearing,
            isDriving: statusInfo.isDriving,
            dateTime: statusInfo.dateTime,
            driverId: driverId,
            driverInfo: driverInfo,
            deviceInfo: deviceInfo,
            statusInfo: statusInfo,
            responseTimestamp: new Date().toISOString()
          })
        })
      }

      console.log(`[REALTIME] Found ${deviceData?.length || 0} devices, ${deviceStatusData?.length || 0} status records, ${userData?.length || 0} users`)
      console.log(`[REALTIME] Combined into ${combinedData.length} records`)

      // Cache the data in memory for immediate use
      if (combinedData.length > 0) {
        this.fleetDataCache = {
          data: combinedData,
          timestamp: new Date()
        }
        console.log(`[REALTIME] Cached ${combinedData.length} fleet records for immediate use`)

        // Save snapshot only for manual API calls (not during automatic polling)
        if (!skipSnapshot) {
          await this.saveFleetDataSnapshot(combinedData, 'Manual API call snapshot')
        }

        // If we don't have stored credentials but the call was successful, store them for future polling
        if (!this.memoryAuth && actualAuthData && actualAuthData.username && actualAuthData.password && actualAuthData.password !== 'from_memory') {
          console.log('[REALTIME] Successful API call with credentials - storing for automatic polling')
          this.memoryAuth = {
            database: actualAuthData.database,
            username: actualAuthData.username,
            password: actualAuthData.password
          }
        }

        // If we have credentials stored and polling isn't active, start it now
        if (this.memoryAuth && this.memoryAuth.username && this.memoryAuth.password && !this.pollingInterval) {
          console.log('[REALTIME] Valid credentials available (automatic polling disabled)')
          // DISABLED: this.startAutomaticPolling()
        }
      }

      return {
        success: true,
        deviceData: deviceData || [],
        deviceStatusData: deviceStatusData || [],
        userData: userData || [],
        combinedData: combinedData
      }
    } catch (error: any) {
      console.error('[REALTIME] Error in getRealTimeFleetInfo:', error)
      
      try {
        // Use our throttle-aware error handler
        this.handleApiError(error)
      } catch (handledError: any) {
        return {
          success: false,
          error: handledError.message
        }
      }
    }
  }

  // Get authentication status from memory
  async getMemoryAuthStatus(): Promise<{ isAuthenticated: boolean, database?: string, username?: string }> {
    if (this.memoryAuth) {
      // Check if polling should be running but isn't
      if (this.memoryAuth.username && this.memoryAuth.password && !this.pollingInterval) {
        console.log('[GEOTAB] Credentials exist (automatic polling disabled)')
        // DISABLED: this.startAutomaticPolling()
      }
      
      return {
        isAuthenticated: true,
        database: this.memoryAuth.database,
        username: this.memoryAuth.username
      }
    }
    return { isAuthenticated: false }
  }

  // Get cached fleet data
  async getCachedFleetData(): Promise<{ data: any[], timestamp?: Date, isStale?: boolean }> {
    if (!this.fleetDataCache) {
      return { data: [] }
    }

    const now = new Date()
    const age = now.getTime() - this.fleetDataCache.timestamp.getTime()
    const isStale = age > 15 * 60 * 1000 // 15 minutes = stale

    return {
      data: this.fleetDataCache.data,
      timestamp: this.fleetDataCache.timestamp,
      isStale
    }
  }

  // Get polling status and next snapshot time
  async getPollingStatus(): Promise<{ 
    isPolling: boolean, 
    lastSnapshot?: Date, 
    nextSnapshot?: Date,
    intervalMinutes: number,
    isThrottled?: boolean,
    throttledUntil?: Date
  }> {
    const isPolling = this.pollingInterval !== null && this.memoryAuth !== null
    const intervalMinutes = 10
    
    if (!isPolling) {
      return { 
        isPolling: false, 
        intervalMinutes,
        isThrottled: this.isThrottled,
        throttledUntil: this.throttledUntil || undefined
      }
    }

    // If polling is active, calculate next snapshot time based on when polling started
    let lastSnapshot: Date | undefined
    let nextSnapshot: Date | undefined

    if (this.fleetDataCache) {
      lastSnapshot = this.fleetDataCache.timestamp
      
      // Calculate next snapshot: add 10 minutes to the last snapshot time
      nextSnapshot = new Date(lastSnapshot.getTime() + (intervalMinutes * 60 * 1000))
      
      // If the calculated next snapshot is in the past, it means we're overdue
      // In that case, the next snapshot should be soon
      if (nextSnapshot.getTime() <= Date.now()) {
        nextSnapshot = new Date(Date.now() + 30000) // 30 seconds from now
      }
    } else {
      // No cached data yet, next snapshot should happen soon
      nextSnapshot = new Date(Date.now() + 60000) // 1 minute from now
    }

    return {
      isPolling: true,
      lastSnapshot,
      nextSnapshot,
      intervalMinutes,
      isThrottled: this.isThrottled,
      throttledUntil: this.throttledUntil || undefined
    }
  }

  // Check if currently throttled
  private checkThrottleStatus(): boolean {
    if (this.isThrottled && this.throttledUntil) {
      const now = new Date()
      if (now >= this.throttledUntil) {
        // Throttle period has expired
        this.isThrottled = false
        this.throttledUntil = null
        console.log('[GEOTAB] Throttle period expired, resuming normal operations')
      }
    }
    return this.isThrottled
  }

  // Set throttle state
  private setThrottled(durationMinutes: number = 1): void {
    this.isThrottled = true
    this.throttledUntil = new Date(Date.now() + (durationMinutes * 60 * 1000))
    console.log(`[GEOTAB] API throttled until ${this.throttledUntil.toISOString()}`)
  }

  // Handle API errors with throttle detection
  private handleApiError(error: any): never {
    const errorMessage = error.message || error.toString()
    
    // Check for Geotab throttle/rate limit errors
    if (errorMessage.includes('OverLimitException') || 
        errorMessage.includes('API calls quota exceeded') ||
        errorMessage.includes('Maximum admitted')) {
      
      this.setThrottled(1) // Throttle for 1 minute
      throw new Error('GEOTAB_THROTTLED: API rate limit exceeded. Geotab will be unavailable for 1 minute.')
    }
    
    // Check for other rate limit patterns
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests') ||
        errorMessage.includes('throttle')) {
      
      this.setThrottled(1)
      throw new Error('GEOTAB_THROTTLED: API temporarily unavailable due to rate limiting.')
    }
    
    // Re-throw other errors as-is
    throw error
  }

  // Clear memory credentials and stop polling
  async clearMemoryAuth(): Promise<boolean> {
    this.memoryAuth = null
    this.stopAutomaticPolling()
    this.fleetDataCache = null
    return true
  }

  // Manually trigger an immediate poll (useful for initial poll after authentication)
  async triggerImmediatePoll(): Promise<{ success: boolean, message?: string }> {
    if (!this.memoryAuth) {
      return {
        success: false,
        message: 'No authentication credentials available for polling'
      }
    }

    try {
      console.log('[GEOTAB] Manual poll triggered')
      await this.pollFleetData()
      return {
        success: true,
        message: 'Immediate poll completed successfully'
      }
    } catch (error: any) {
      console.error('[GEOTAB] Error during manual poll:', error)
      return {
        success: false,
        message: error.message || 'Poll failed'
      }
    }
  }

  // Smart method to get fleet data: cache -> database -> empty (no API calls)
  async getFleetDataSmart(): Promise<{ success: boolean, data?: any[], source?: string, timestamp?: Date, error?: string }> {
    try {
      // First try memory cache
      const cached = await this.getCachedFleetData()
      if (cached.data && cached.data.length > 0) {
        return {
          success: true,
          data: cached.data,
          source: cached.isStale ? 'Memory Cache (Stale)' : 'Memory Cache',
          timestamp: cached.timestamp
        }
      }

      // Then try database snapshot
      const fleetStatusService = this.app.service('fleet-status')
      if (fleetStatusService && typeof fleetStatusService.getLatestFleetStatus === 'function') {
        const latestSnapshot = await fleetStatusService.getLatestFleetStatus()
        if (latestSnapshot && latestSnapshot.length > 0) {
          return {
            success: true,
            data: latestSnapshot,
            source: 'Database Snapshot',
            timestamp: new Date(latestSnapshot[0].recordedAt)
          }
        }
      }

      // No data available anywhere
      return {
        success: false,
        error: 'No fleet data available in cache or database'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to retrieve fleet data'
      }
    }
  }

  // Start automatic polling every 10 minutes
  private startAutomaticPolling(): void {
    console.log('[GEOTAB] startAutomaticPolling called')
    
    // Clear existing interval if any
    this.stopAutomaticPolling()

    if (!this.memoryAuth || !this.memoryAuth.username || !this.memoryAuth.password) {
      console.log('[GEOTAB] No valid credentials available for automatic polling')
      console.log('[GEOTAB] Memory auth status:', this.memoryAuth ? 'exists but incomplete' : 'null')
      return
    }

    console.log(`[GEOTAB] Starting automatic fleet data polling every 10 minutes for user: ${this.memoryAuth.username}`)
    
    // Calculate when the next poll should happen
    const now = new Date()
    let nextPollTime: Date
    
    // Only poll immediately if we don't have recent cached data
    const shouldPollImmediately = !this.fleetDataCache || 
      (now.getTime() - this.fleetDataCache.timestamp.getTime()) > 2 * 60 * 1000 // 2 minutes old
    
    if (shouldPollImmediately) {
      nextPollTime = new Date(now.getTime() + 10000) // 10 seconds from now
      setTimeout(() => {
        console.log('[GEOTAB] Triggering initial poll - no recent data available')
        this.pollFleetData()
      }, 10000) // 10 second delay to avoid conflicts with manual calls
    } else {
      // Next poll will be 10 minutes from the last cached data
      nextPollTime = new Date(this.fleetDataCache!.timestamp.getTime() + (10 * 60 * 1000))
      console.log(`[GEOTAB] Recent cached data available - next poll scheduled for ${nextPollTime.toISOString()}`)
      
      // Schedule the first poll at the correct time
      const delayToNextPoll = nextPollTime.getTime() - now.getTime()
      if (delayToNextPoll > 0) {
        setTimeout(() => {
          console.log('[GEOTAB] Scheduled poll triggered (delayed start)')
          this.pollFleetData()
        }, delayToNextPoll)
        console.log(`[GEOTAB] First poll scheduled in ${Math.round(delayToNextPoll / 1000)} seconds`)
      } else {
        // If calculated time is in the past, poll in 10 minutes from now
        setTimeout(() => {
          console.log('[GEOTAB] Scheduled poll triggered (overdue)')
          this.pollFleetData()
        }, 10 * 60 * 1000)
        console.log('[GEOTAB] Next poll was overdue, scheduling in 10 minutes from now')
      }
    }

    // Set up 10-minute interval (will start after first poll)
    this.pollingInterval = setInterval(() => {
      console.log('[GEOTAB] Scheduled poll triggered (regular interval)')
      this.pollFleetData()
    }, 10 * 60 * 1000) // 10 minutes
    
    console.log('[GEOTAB] Polling interval established')
  }

  // Stop automatic polling
  private stopAutomaticPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
      console.log('[GEOTAB] Stopped automatic fleet data polling')
    }
  }

  // Helper method to save fleet data to MongoDB
  private async saveFleetDataSnapshot(fleetData: any[], source: string): Promise<void> {
    try {
      const fleetStatusService = this.app.service('fleet-status')
      console.log(`[GEOTAB] ${source} - saving ${fleetData.length} records to MongoDB`)
      
      if (fleetStatusService && typeof fleetStatusService.bulkCreateFleetSnapshots === 'function') {
        const savedRecords = await fleetStatusService.bulkCreateFleetSnapshots(fleetData)
        console.log(`[GEOTAB] Successfully saved ${savedRecords.length} fleet records to MongoDB`)
      } else {
        console.error('[GEOTAB] FleetStatus service method not found')
      }
    } catch (dbError: any) {
      console.error('[GEOTAB] Error saving fleet data to MongoDB:', dbError)
    }
  }

  // Poll fleet data and cache it
  private async pollFleetData(): Promise<void> {
    if (!this.memoryAuth) {
      console.log('[GEOTAB] No credentials available for polling')
      return
    }

    try {
      console.log('[GEOTAB] Polling fleet data...')
      const response = await this.getRealTimeFleetInfo(this.memoryAuth, true) // Skip snapshot since we'll save it here
      
      if (response.success && response.combinedData) {
        // Cache in memory
        this.fleetDataCache = {
          data: response.combinedData,
          timestamp: new Date()
        }
        console.log(`[GEOTAB] Cached ${response.combinedData.length} fleet records at ${this.fleetDataCache.timestamp.toISOString()}`)

        // Save to MongoDB
        await this.saveFleetDataSnapshot(response.combinedData, 'Scheduled polling')
      } else {
        console.error('[GEOTAB] Failed to poll fleet data:', response.error)
      }
    } catch (error: any) {
      console.error('[GEOTAB] Error during fleet data polling:', error.message)
    }
  }

  // Get trip data using GetFeed API with date-based caching
  async getTripData(data: { fromDate?: string, toDate?: string, authData?: any }, params?: any): Promise<{ trips: any[], version?: string, fromCache: boolean }> {
    console.log(`[GEOTAB] getTripData called - METHOD IS WORKING!`)
    console.log(`[GEOTAB] getTripData called with fromDate:`, data.fromDate, 'toDate:', data.toDate)
    console.log(`[GEOTAB] getTripData data:`, data)
    console.log(`[GEOTAB] getTripData params:`, params)
    
    if (!data.fromDate) {
      throw new Error('fromDate is required')
    }

    if (!data.authData) {
      throw new Error('Authentication data is required for trip data retrieval')
    }

    // Create cache key from the date range (include toDate if provided)
    const fromDateKey = data.fromDate.split('T')[0]
    const toDateKey = data.toDate ? data.toDate.split('T')[0] : 'open'
    const dateKey = data.toDate ? `${fromDateKey}_to_${toDateKey}` : fromDateKey
    
    // Check if we have cached data for this date
    if (this.tripDataByDate.has(dateKey)) {
      const cachedData = this.tripDataByDate.get(dateKey)!
      console.log(`[GEOTAB] Returning cached trip data for ${dateKey} (${cachedData.trips.length} records)`)
      return {
        trips: cachedData.trips,
        version: cachedData.version || undefined,
        fromCache: true
      }
    }
    
    try {
      // Use GetFeed API call with proper authentication
      console.log(`[GEOTAB] Making GetFeed call for Trip data`)
      
      const feedParams: any = {
        typeName: 'Trip',
        search: {
          fromDate: data.fromDate
        }
      }
      
      // Add toDate to limit the search range if provided
      if (data.toDate) {
        feedParams.search.toDate = data.toDate
        console.log(`[GEOTAB] Using date range: ${data.fromDate} to ${data.toDate}`)
      } else {
        console.log(`[GEOTAB] Using open-ended search from: ${data.fromDate}`)
      }
      
      // Check if we should use stored credentials or provided credentials
      let actualPassword = data.authData.password
      
      if (data.authData.password === 'from_memory') {
        // Use stored credentials from memory
        if (!this.memoryAuth || !this.memoryAuth.password) {
          throw new Error('No stored password available. Please re-authenticate.')
        }
        actualPassword = this.memoryAuth.password
        console.log('[GEOTAB] Using stored password from memory')
      }
      
      // Create authentication structure for GetFeed
      const credentials = {
        database: data.authData.database,
        userName: data.authData.username,
        password: actualPassword
      }

      const GeotabApi = require('mg-api-js')
      const authObj = {
        credentials: credentials,
        path: 'https://my.geotab.com'
      }
      const api = new GeotabApi(authObj, { rememberMe: false })

      const response = await new Promise((resolve, reject) => {
        api.call(
          'GetFeed', 
          feedParams,
          (result: any) => {
            if (result && result.error) {
              reject(new Error(result.error.message || 'GetFeed API call returned error'))
              return
            }
            resolve(result.result || result)
          },
          (error: any) => {
            reject(new Error(error.message || 'GetFeed API call failed'))
          }
        )
      })
      
      console.log(`[GEOTAB] Retrieved ${(response as any).data?.length || 0} trip records`)
      console.log(`[GEOTAB] Response toVersion: ${(response as any).toVersion}`)
      
      // Enrich trip data with fleet status information
      const enrichedTrips = await this.enrichTripDataWithFleetStatus((response as any).data || [])
      
      // Cache the enriched data by date
      const cacheEntry = {
        trips: enrichedTrips,
        version: (response as any).toVersion || null,
        lastUpdated: new Date()
      }
      this.tripDataByDate.set(dateKey, cacheEntry)
      
      console.log(`[GEOTAB] Cached ${cacheEntry.trips.length} enriched trip records for ${dateKey}`)
      
      return {
        trips: cacheEntry.trips,
        version: (response as any).toVersion || undefined,
        fromCache: false
      }
      
    } catch (error: any) {
      console.error('[GEOTAB] Error in getTripData:', error)
      throw error
    }
  }

  // Clear trip data cache
  async clearTripCache(): Promise<{ success: boolean }> {
    console.log(`[GEOTAB] Clearing all trip cache (${this.tripDataByDate.size} date entries)`)
    this.tripDataByDate.clear()
    return { success: true }
  }

  // Get driver data using GetFeed API with pagination
  async getDriverData(data: { authData?: any }, params?: any): Promise<{ 
    drivers: any[], 
    version?: string, 
    fromCache: boolean 
  }> {
    console.log(`[GEOTAB] getDriverData called - METHOD IS WORKING!`)
    console.log(`[GEOTAB] getDriverData data:`, data)
    console.log(`[GEOTAB] getDriverData params:`, params)
    
    if (!data.authData) {
      throw new Error('Authentication data is required for driver data retrieval')
    }

    // Check if we have fresh cached data (less than 1 hour old)
    if (this.driverDataCache) {
      const cacheAge = Date.now() - this.driverDataCache.lastUpdated.getTime()
      const oneHour = 60 * 60 * 1000
      
      if (cacheAge < oneHour) {
        console.log(`[GEOTAB] Returning cached driver data (${this.driverDataCache.drivers.length} records)`)
        return {
          drivers: this.driverDataCache.drivers,
          version: this.driverDataCache.version || undefined,
          fromCache: true
        }
      }
    }
    
    try {
      console.log(`[GEOTAB] Making GetFeed call for Driver data`)
      
      // Check if we should use stored credentials or provided credentials
      let actualPassword = data.authData.password
      
      if (data.authData.password === 'from_memory') {
        if (!this.memoryAuth || !this.memoryAuth.password) {
          throw new Error('No stored password available. Please re-authenticate.')
        }
        actualPassword = this.memoryAuth.password
        console.log('[GEOTAB] Using stored password from memory')
      }
      
      // Create authentication structure for GetFeed
      const credentials = {
        database: data.authData.database,
        userName: data.authData.username,
        password: actualPassword
      }

      const GeotabApi = require('mg-api-js')
      const authObj = {
        credentials: credentials,
        path: 'https://my.geotab.com'
      }
      const api = new GeotabApi(authObj, { rememberMe: false })

      // Get all users using simple Get call (no pagination needed for User entity)
      console.log(`[GEOTAB] Making Get call for User data`)

      const getParams = {
        typeName: 'User'
      }

      const response = await new Promise((resolve, reject) => {
        api.call(
          'Get', 
          getParams,
          (result: any) => {
            if (result && result.error) {
              reject(new Error(result.error.message || 'Get API call returned error'))
              return
            }
            resolve(result.result || result)
          },
          (error: any) => {
            reject(new Error(error.message || 'Get API call failed'))
          }
        )
      })

      const allUsers = (response as any) || []
      
      console.log(`[GEOTAB] Retrieved ${allUsers.length} total user records`)
      
      // Get cached group data for cross-referencing
      const groupLookup = new Map()
      if (this.groupDataCache && this.groupDataCache.groups) {
        this.groupDataCache.groups.forEach(group => {
          groupLookup.set(group.groupId, group.groupName)
        })
        console.log(`[GEOTAB] Using ${groupLookup.size} cached groups for driver lookup`)
      }
      
      // Filter for valid drivers and process their data
      const allDrivers = allUsers.filter((user: any) => {
        // A valid driver must have an employeeNo (Employee ID in our drivers DB)
        // and should have firstName/lastName for full name display
        return user.employeeNo && (user.firstName || user.lastName)
      }).map((user: any) => {
        // Look up group names from driverGroups IDs
        let groupNames: string[] = []
        if (user.driverGroups && Array.isArray(user.driverGroups)) {
          groupNames = user.driverGroups
            .map((group: any) => {
              const groupId = group.id || group
              return groupLookup.get(groupId) || `Unknown (${groupId})`
            })
            .filter(Boolean)
        }

        // Check if driver is archived based on activeTo date
        let isArchived = false
        let activeToDate = null
        if (user.activeTo) {
          try {
            activeToDate = new Date(user.activeTo)
            const today = new Date()
            isArchived = activeToDate < today
          } catch (error) {
            console.warn(`Invalid activeTo date for driver ${user.id}:`, user.activeTo)
          }
        }

        // Process and format driver data with correct field mappings
        return {
          ...user, // Keep all original Geotab data
          // Field mappings:
          employeeId: user.employeeNo, // employeeNo -> Employee ID used in our drivers DB
          geotabUsername: user.name,   // name -> Geotab username (like "qtraylor")
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown Driver',
          groups: groupNames, // Add resolved group names
          isArchived: isArchived, // Add archived status
          activeTo: user.activeTo, // Add activeTo date
          activeToDate: activeToDate, // Add parsed activeTo date
          // Keep original fields for reference
          employeeNo: user.employeeNo,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName
        }
      })

      console.log(`[GEOTAB] Filtered to ${allDrivers.length} valid drivers from ${allUsers.length} users`)
      
      // Log sample driver data for debugging
      if (allDrivers.length > 0) {
        console.log(`[GEOTAB] Sample driver data:`, {
          fullName: allDrivers[0].fullName,
          employeeId: allDrivers[0].employeeId,
          geotabUsername: allDrivers[0].geotabUsername,
          id: allDrivers[0].id
        })
      }
      
      console.log(`[GEOTAB] Retrieved ${allDrivers.length} total driver records`)
      
      // Cache the driver data
      const cacheEntry = {
        drivers: allDrivers,
        version: null, // No versioning for Get API calls
        lastUpdated: new Date()
      }
      this.driverDataCache = cacheEntry
      
      console.log(`[GEOTAB] Cached ${cacheEntry.drivers.length} driver records`)
      
      return {
        drivers: cacheEntry.drivers,
        version: undefined, // No versioning for Get API calls
        fromCache: false
      }
      
    } catch (error: any) {
      console.error('[GEOTAB] Error in getDriverData:', error)
      throw error
    }
  }

  // Clear driver data cache
  async clearDriverCache(): Promise<{ success: boolean }> {
    console.log(`[GEOTAB] Clearing driver cache`)
    this.driverDataCache = null
    return { success: true }
  }

  // Get device data using Get API with caching
  async getDeviceData(data: { authData?: any }, params?: any): Promise<{ 
    devices: any[], 
    version?: string, 
    fromCache: boolean 
  }> {
    console.log(`[GEOTAB] getDeviceData called - METHOD IS WORKING!`)
    console.log(`[GEOTAB] getDeviceData data:`, data)
    console.log(`[GEOTAB] getDeviceData params:`, params)
    
    if (!data.authData) {
      throw new Error('Authentication data is required for device data retrieval')
    }

    // Check if we have fresh cached data (less than 1 hour old)
    if (this.deviceDataCache) {
      const cacheAge = Date.now() - this.deviceDataCache.lastUpdated.getTime()
      const oneHour = 60 * 60 * 1000
      
      if (cacheAge < oneHour) {
        console.log(`[GEOTAB] Returning cached device data (${this.deviceDataCache.devices.length} records)`)
        return {
          devices: this.deviceDataCache.devices,
          version: this.deviceDataCache.version || undefined,
          fromCache: true
        }
      }
    }
    
    try {
      console.log(`[GEOTAB] Making Get call for Device data`)
      
      // Check if we should use stored credentials or provided credentials
      let actualPassword = data.authData.password
      
      if (data.authData.password === 'from_memory') {
        if (!this.memoryAuth || !this.memoryAuth.password) {
          throw new Error('No stored password available. Please re-authenticate.')
        }
        actualPassword = this.memoryAuth.password
        console.log('[GEOTAB] Using stored password from memory')
      }
      
      // Create authentication structure for Get
      const credentials = {
        database: data.authData.database,
        userName: data.authData.username,
        password: actualPassword
      }

      const GeotabApi = require('mg-api-js')
      const authObj = {
        credentials: credentials,
        path: 'https://my.geotab.com'
      }
      const api = new GeotabApi(authObj, { rememberMe: false })

      // Get all devices using simple Get call (no pagination needed for Device entity)
      console.log(`[GEOTAB] Making Get call for Device data`)

      const getParams = {
        typeName: 'Device'
      }

      const response = await new Promise((resolve, reject) => {
        api.call(
          'Get', 
          getParams,
          (result: any) => {
            if (result && result.error) {
              reject(new Error(result.error.message || 'Get API call returned error'))
              return
            }
            resolve(result.result || result)
          },
          (error: any) => {
            reject(new Error(error.message || 'Get API call failed'))
          }
        )
      })

      const allDevices = (response as any) || []
      
      console.log(`[GEOTAB] Retrieved ${allDevices.length} total device records`)
      
      // Get cached group data for cross-referencing
      const groupLookup = new Map()
      if (this.groupDataCache && this.groupDataCache.groups) {
        this.groupDataCache.groups.forEach(group => {
          groupLookup.set(group.groupId, group.groupName)
        })
        console.log(`[GEOTAB] Using ${groupLookup.size} cached groups for device lookup`)
      }
      
      // Process and format device data
      const processedDevices = allDevices.map((device: any) => {
        // Look up group names from group IDs
        let groupNames: string[] = []
        if (device.groups && Array.isArray(device.groups)) {
          groupNames = device.groups
            .map((group: any) => {
              const groupId = group.id || group
              return groupLookup.get(groupId) || `Unknown (${groupId})`
            })
            .filter(Boolean)
        }

        return {
          ...device, // Keep all original Geotab data
          // Field mappings for clarity
          truckNumber: device.name,        // name -> Truck Number
          geotabId: device.id,            // id -> Geotab ID
          vin: device.vehicleIdentificationNumber, // VIN
          plate: device.licensePlate,     // License Plate
          plateState: device.licenseState, // License State
          groups: groupNames // Add resolved group names
        }
      })

      console.log(`[GEOTAB] Processed ${processedDevices.length} device records`)
      
      // Cache the device data
      const cacheEntry = {
        devices: processedDevices,
        version: null, // No versioning for Get API calls
        lastUpdated: new Date()
      }
      this.deviceDataCache = cacheEntry
      
      console.log(`[GEOTAB] Cached ${cacheEntry.devices.length} device records`)
      
      return {
        devices: cacheEntry.devices,
        version: undefined, // No versioning for Get API calls
        fromCache: false
      }
      
    } catch (error: any) {
      console.error('[GEOTAB] Error in getDeviceData:', error)
      throw error
    }
  }

  // Clear device data cache
  async clearDeviceCache(): Promise<{ success: boolean }> {
    console.log(`[GEOTAB] Clearing device cache`)
    this.deviceDataCache = null
    return { success: true }
  }

  // Get group data using Get API with caching
  async getGroupData(data: { authData?: any }, params?: any): Promise<{ 
    groups: any[], 
    version?: string, 
    fromCache: boolean 
  }> {
    console.log(`[GEOTAB] getGroupData called - METHOD IS WORKING!`)
    console.log(`[GEOTAB] getGroupData data:`, data)
    console.log(`[GEOTAB] getGroupData params:`, params)
    
    if (!data.authData) {
      throw new Error('Authentication data is required for group data retrieval')
    }

    // Check if we have fresh cached data (less than 1 hour old)
    if (this.groupDataCache) {
      const cacheAge = Date.now() - this.groupDataCache.lastUpdated.getTime()
      const oneHour = 60 * 60 * 1000
      
      if (cacheAge < oneHour) {
        console.log(`[GEOTAB] Returning cached group data (${this.groupDataCache.groups.length} records)`)
        return {
          groups: this.groupDataCache.groups,
          version: this.groupDataCache.version || undefined,
          fromCache: true
        }
      }
    }
    
    try {
      console.log(`[GEOTAB] Making Get call for Group data`)
      
      // Check if we should use stored credentials or provided credentials
      let actualPassword = data.authData.password
      
      if (data.authData.password === 'from_memory') {
        if (!this.memoryAuth || !this.memoryAuth.password) {
          throw new Error('No stored password available. Please re-authenticate.')
        }
        actualPassword = this.memoryAuth.password
        console.log('[GEOTAB] Using stored password from memory')
      }
      
      // Create authentication structure for Get
      const credentials = {
        database: data.authData.database,
        userName: data.authData.username,
        password: actualPassword
      }

      const GeotabApi = require('mg-api-js')
      const authObj = {
        credentials: credentials,
        path: 'https://my.geotab.com'
      }
      const api = new GeotabApi(authObj, { rememberMe: false })

      const response = await new Promise((resolve, reject) => {
        api.call(
          'Get', 
          {
            typeName: 'Group',
            resultsLimit: 1000
          },
          (result: any) => {
            if (result && result.error) {
              reject(new Error(result.error.message || 'Get API call returned error'))
              return
            }
            resolve(result || [])
          },
          (error: any) => {
            reject(new Error(error.message || 'Get API call failed'))
          }
        )
      })
      
      console.log(`[GEOTAB] Retrieved ${(response as any[]).length || 0} group records`)
      
      // Process groups - filter only those with id and name
      const processedGroups = (response as any[])
        .filter(group => group.id && group.name)
        .map(group => ({
          groupId: group.id,
          groupName: group.name,
          ...group // Include all original fields
        }))
      
      console.log(`[GEOTAB] Processed ${processedGroups.length} groups with id and name`)
      
      // Cache the data
      this.groupDataCache = {
        groups: processedGroups,
        version: null,
        lastUpdated: new Date()
      }
      
      console.log(`[GEOTAB] Cached ${this.groupDataCache.groups.length} group records`)
      
      return {
        groups: this.groupDataCache.groups,
        version: undefined,
        fromCache: false
      }
      
    } catch (error: any) {
      console.error('[GEOTAB] Error in getGroupData:', error)
      throw error
    }
  }

  // Clear group data cache
  async clearGroupCache(): Promise<{ success: boolean }> {
    console.log(`[GEOTAB] Clearing group cache`)
    this.groupDataCache = null
    return { success: true }
  }

  // Enrich trip data with cached import data for complete driver/device information
  private async enrichTripDataWithFleetStatus(trips: any[]): Promise<any[]> {
    try {
      console.log(`[GEOTAB] Enriching ${trips.length} trip records with cached import data`)
      
      // Create lookup maps for fast cross-referencing
      const deviceLookup = new Map()
      const driverLookup = new Map()
      
      // First priority: Use cached driver data from Import Drivers
      if (this.driverDataCache && this.driverDataCache.drivers) {
        console.log(`[GEOTAB] Using cached driver data: ${this.driverDataCache.drivers.length} drivers`)
        for (const driver of this.driverDataCache.drivers) {
          // Extract driver name from keys or use the name field
          let firstName = ''
          let lastName = ''
          
          if (driver.keys && Array.isArray(driver.keys)) {
            const firstNameKey = driver.keys.find((k: any) => k.id === 'DriverFirstName')
            const lastNameKey = driver.keys.find((k: any) => k.id === 'DriverLastName')
            if (firstNameKey) firstName = firstNameKey.value || ''
            if (lastNameKey) lastName = lastNameKey.value || ''
          }
          
          // Fallback to name field if keys don't have names
          const fullName = firstName && lastName ? `${firstName} ${lastName}` : driver.name || 'Unknown Driver'
          
          // Get driver groups (already converted to names in the cache)
          const driverGroups = driver.driverGroups || []
          
          driverLookup.set(driver.id, {
            driverId: driver.id,
            driverName: driver.name, // Geotab username
            fullName: fullName,
            firstName: firstName,
            lastName: lastName,
            groups: driverGroups,
            isActive: driver.isActiveDriver !== false,
            driver: fullName // For compatibility
          })
        }
      } else {
        console.log('[GEOTAB] No cached driver data available')
      }
      
      // First priority: Use cached device data from Import Devices
      if (this.deviceDataCache && this.deviceDataCache.devices) {
        console.log(`[GEOTAB] Using cached device data: ${this.deviceDataCache.devices.length} devices`)
        for (const device of this.deviceDataCache.devices) {
          deviceLookup.set(device.id, {
            deviceId: device.id,
            deviceName: device.name,
            truckID: device.truckNumber || device.name, // Prefer truckNumber over name
            truckNumber: device.truckNumber,
            groups: device.groups || [],
            vin: device.vehicleIdentificationNumber || device.vin,
            licensePlate: device.licensePlate,
            licenseState: device.licenseState,
            isActive: device.activeTo ? new Date(device.activeTo) > new Date() : true
          })
        }
      } else {
        console.log('[GEOTAB] No cached device data available')
      }
      
      // Fallback: If no cached data, try fleet status service
      if (deviceLookup.size === 0 || driverLookup.size === 0) {
        console.log('[GEOTAB] Falling back to fleet status service for missing data')
        const fleetStatusService = this.app.service('fleet-status')
        if (fleetStatusService) {
          const recentFleetStatus = await fleetStatusService.find({
            query: {
              $sort: { recordedAt: -1 },
              $limit: 1000
            },
            paginate: false
          })

          const fleetRecords = Array.isArray(recentFleetStatus) ? recentFleetStatus : (recentFleetStatus as any).data || []
          console.log(`[GEOTAB] Found ${fleetRecords.length} fleet status records for fallback`)

          for (const record of fleetRecords) {
            // Only add if not already in lookup from cache
            if (record.deviceId && record.deviceName && !deviceLookup.has(record.deviceId)) {
              deviceLookup.set(record.deviceId, {
                deviceId: record.deviceId,
                deviceName: record.deviceName,
                truckID: record.deviceName,
                truckNumber: record.deviceName,
                groups: [],
                isActive: true
              })
            }

            if (record.driverId && record.driverInfo && !driverLookup.has(record.driverId)) {
              driverLookup.set(record.driverId, {
                driverId: record.driverId,
                driverInfo: record.driverInfo,
                driver: record.driverInfo.name || 
                       `${record.driverInfo.firstName || ''} ${record.driverInfo.lastName || ''}`.trim() ||
                       'Unknown Driver',
                fullName: record.driverInfo.name || 
                         `${record.driverInfo.firstName || ''} ${record.driverInfo.lastName || ''}`.trim() ||
                         'Unknown Driver',
                groups: [],
                isActive: true
              })
            }
          }
        }
      }

      console.log(`[GEOTAB] Created lookup maps: ${deviceLookup.size} devices, ${driverLookup.size} drivers`)

      // Enrich each trip record
      const enrichedTrips = trips.map((trip) => {
        const enrichedTrip = { ...trip }
        let deviceEnriched = false
        let driverEnriched = false

        // Cross-reference device information
        if (trip.device && trip.device.id) {
          const deviceInfo = deviceLookup.get(trip.device.id)
          if (deviceInfo) {
            // Add all device information
            enrichedTrip.deviceInfo = deviceInfo
            enrichedTrip.truckID = deviceInfo.truckID
            enrichedTrip.truckNumber = deviceInfo.truckNumber
            enrichedTrip.deviceGroups = deviceInfo.groups
            enrichedTrip.vin = deviceInfo.vin
            enrichedTrip.licensePlate = deviceInfo.licensePlate
            enrichedTrip.licenseState = deviceInfo.licenseState
            enrichedTrip.deviceIsActive = deviceInfo.isActive
            deviceEnriched = true
          } else {
            // Fallback to trip's embedded device info
            enrichedTrip.truckID = trip.device.name || 'Unknown Device'
            enrichedTrip.deviceGroups = []
          }
        }

        // Cross-reference driver information  
        if (trip.driver && trip.driver.id) {
          const driverInfo = driverLookup.get(trip.driver.id)
          if (driverInfo) {
            // Add all driver information
            enrichedTrip.driverInfo = driverInfo
            enrichedTrip.driverName = driverInfo.fullName || driverInfo.driver
            enrichedTrip.driverUsername = driverInfo.driverName // Geotab username
            enrichedTrip.driverFirstName = driverInfo.firstName
            enrichedTrip.driverLastName = driverInfo.lastName
            enrichedTrip.driverGroups = driverInfo.groups
            enrichedTrip.driverIsActive = driverInfo.isActive
            driverEnriched = true
          } else {
            // Fallback to trip's embedded driver info
            enrichedTrip.driverName = trip.driver.name || 'Unknown Driver'
            enrichedTrip.driverGroups = []
          }
        }
        
        // Mark as enriched if either device or driver was enriched
        enrichedTrip.enriched = deviceEnriched || driverEnriched
        enrichedTrip.deviceEnriched = deviceEnriched
        enrichedTrip.driverEnriched = driverEnriched
        
        // Add terminal group association (find common groups between driver and device)
        if (enrichedTrip.driverGroups && enrichedTrip.deviceGroups) {
          const driverGroupNames = enrichedTrip.driverGroups.map((g: any) => 
            typeof g === 'object' ? g.name : g
          )
          const deviceGroupNames = enrichedTrip.deviceGroups.map((g: any) => 
            typeof g === 'object' ? g.name : g
          )
          
          // Find common groups
          const commonGroups = driverGroupNames.filter((group: string) => 
            deviceGroupNames.includes(group)
          )
          enrichedTrip.terminalGroups = commonGroups
        }

        return enrichedTrip
      })

      const enrichedCount = enrichedTrips.filter(trip => trip.enriched).length
      const deviceEnrichedCount = enrichedTrips.filter(trip => trip.deviceEnriched).length
      const driverEnrichedCount = enrichedTrips.filter(trip => trip.driverEnriched).length
      
      console.log(`[GEOTAB] Successfully enriched ${enrichedCount} out of ${trips.length} trip records`)
      console.log(`[GEOTAB] Device enrichment: ${deviceEnrichedCount}, Driver enrichment: ${driverEnrichedCount}`)

      return enrichedTrips
      
    } catch (error: any) {
      console.error('[GEOTAB] Error enriching trip data:', error)
      // Return original trips if enrichment fails
      return trips
    }
  }

  // Get real-time vehicle location and status for specific route
  async getRouteProgress(data: { 
    truckNumber?: string, 
    driverGeotabId?: string, 
    routeId?: string,
    authData: GeotabAuth 
  }): Promise<{
    success: boolean,
    vehicleStatus?: {
      deviceId: string,
      deviceName: string,
      driverId?: string,
      driverName?: string,
      location?: { latitude: number, longitude: number },
      speed?: number,
      isDriving: boolean,
      bearing?: number,
      lastUpdate: string,
      distanceTraveled?: number,
      estimatedCompletion?: number
    },
    error?: string
  }> {
    try {
      console.log(`[GEOTAB] Getting route progress for truck: ${data.truckNumber}, driver: ${data.driverGeotabId}`)

      // Get real-time fleet info
      const fleetData = await this.getRealTimeFleetInfo(data.authData, true)
      if (!fleetData.success || !fleetData.combinedData) {
        throw new Error('Failed to get fleet data from Geotab')
      }

      // Find the specific vehicle by truck number or driver
      let vehicleData = null
      
      if (data.truckNumber) {
        vehicleData = fleetData.combinedData.find((item: any) => 
          item.deviceName === data.truckNumber || 
          item.deviceName?.includes(data.truckNumber)
        )
      }
      
      // If not found by truck number, try by driver geotab ID
      if (!vehicleData && data.driverGeotabId) {
        vehicleData = fleetData.combinedData.find((item: any) => 
          item.driverId === data.driverGeotabId ||
          item.driver?.id === data.driverGeotabId
        )
      }

      if (!vehicleData) {
        return {
          success: false,
          error: `Vehicle not found in Geotab fleet data. Truck: ${data.truckNumber}, Driver: ${data.driverGeotabId}`
        }
      }

      // Calculate distance traveled today (if trip data available)
      let distanceTraveled = 0
      let estimatedCompletion = 0
      
      try {
        const today = new Date().toISOString().split('T')[0]
        const tripData = await this.getTripData({
          fromDate: `${today}T00:00:00.000Z`,
          toDate: `${today}T23:59:59.999Z`,
          authData: data.authData
        })
        
        if (tripData.trips && tripData.trips.length > 0) {
          // Find trips for this specific device
          const deviceTrips = tripData.trips.filter((trip: any) => 
            trip.device?.id === vehicleData.deviceId ||
            trip.deviceInfo?.truckID === data.truckNumber
          )
          
          // Calculate total distance from completed trips
          distanceTraveled = deviceTrips.reduce((total: number, trip: any) => {
            return total + (trip.distance || 0)
          }, 0)
          
          // Estimate completion based on average trip progress
          if (deviceTrips.length > 0) {
            const avgTripDuration = deviceTrips.reduce((total: number, trip: any) => {
              const startTime = new Date(trip.start).getTime()
              const endTime = trip.stop ? new Date(trip.stop).getTime() : Date.now()
              return total + (endTime - startTime)
            }, 0) / deviceTrips.length
            
            estimatedCompletion = Math.round((avgTripDuration / (1000 * 60)) * 100) / 100 // Convert to decimal hours
          }
        }
      } catch (tripError) {
        console.warn('[GEOTAB] Could not get trip data for distance calculation:', tripError)
      }

      return {
        success: true,
        vehicleStatus: {
          deviceId: vehicleData.deviceId,
          deviceName: vehicleData.deviceName,
          driverId: vehicleData.driverId,
          driverName: vehicleData.driverName || vehicleData.driver?.name || 'Unknown Driver',
          location: vehicleData.latitude && vehicleData.longitude ? {
            latitude: vehicleData.latitude,
            longitude: vehicleData.longitude
          } : undefined,
          speed: vehicleData.speed || 0,
          isDriving: vehicleData.isDriving || false,
          bearing: vehicleData.bearing,
          lastUpdate: vehicleData.dateTime || new Date().toISOString(),
          distanceTraveled,
          estimatedCompletion
        }
      }

    } catch (error: any) {
      console.error('[GEOTAB] Error getting route progress:', error)
      return {
        success: false,
        error: error.message || 'Failed to get route progress'
      }
    }
  }

  // Get fleet status for multiple routes at once
  async getFleetRouteStatus(data: {
    routes: Array<{ 
      routeId: string,
      truckNumber?: string,
      driverGeotabId?: string 
    }>,
    authData: GeotabAuth
  }): Promise<{
    success: boolean,
    routeStatuses?: Array<{
      routeId: string,
      status: 'active' | 'idle' | 'offline' | 'unknown',
      location?: { latitude: number, longitude: number },
      speed?: number,
      lastUpdate?: string,
      distanceTraveled?: number
    }>,
    error?: string
  }> {
    try {
      console.log(`[GEOTAB] Getting fleet route status for ${data.routes.length} routes`)

      // Get real-time fleet info once for all routes
      const fleetData = await this.getRealTimeFleetInfo(data.authData, true)
      if (!fleetData.success || !fleetData.combinedData) {
        throw new Error('Failed to get fleet data from Geotab')
      }

      const routeStatuses = []

      for (const route of data.routes) {
        try {
          // Find vehicle data for this route
          let vehicleData = null
          
          if (route.truckNumber) {
            vehicleData = fleetData.combinedData.find((item: any) => 
              item.deviceName === route.truckNumber || 
              item.deviceName?.includes(route.truckNumber)
            )
          }
          
          if (!vehicleData && route.driverGeotabId) {
            vehicleData = fleetData.combinedData.find((item: any) => 
              item.driverId === route.driverGeotabId ||
              item.driver?.id === route.driverGeotabId
            )
          }

          if (vehicleData) {
            // Determine status based on vehicle activity
            let status: 'active' | 'idle' | 'offline' | 'unknown' = 'unknown'
            
            if (vehicleData.isDriving && vehicleData.speed > 5) {
              status = 'active'
            } else if (vehicleData.speed !== undefined && vehicleData.speed <= 5) {
              status = 'idle'
            } else {
              // Check if last update is recent (within 30 minutes)
              const lastUpdateTime = new Date(vehicleData.dateTime).getTime()
              const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
              status = lastUpdateTime > thirtyMinutesAgo ? 'idle' : 'offline'
            }

            routeStatuses.push({
              routeId: route.routeId,
              status,
              location: vehicleData.latitude && vehicleData.longitude ? {
                latitude: vehicleData.latitude,
                longitude: vehicleData.longitude
              } : undefined,
              speed: vehicleData.speed || 0,
              lastUpdate: vehicleData.dateTime,
              distanceTraveled: 0 // TODO: Calculate from trip data if needed
            })
          } else {
            // Vehicle not found in fleet data
            routeStatuses.push({
              routeId: route.routeId,
              status: 'offline' as 'offline'
            })
          }

        } catch (routeError) {
          console.error(`[GEOTAB] Error processing route ${route.routeId}:`, routeError)
          routeStatuses.push({
            routeId: route.routeId,
            status: 'unknown' as 'unknown'
          })
        }
      }

      return {
        success: true,
        routeStatuses
      }

    } catch (error: any) {
      console.error('[GEOTAB] Error getting fleet route status:', error)
      return {
        success: false,
        error: error.message || 'Failed to get fleet route status'
      }
    }
  }

  async updateDatabaseGroups(data?: any): Promise<{
    success: boolean,
    driversUpdated?: number,
    devicesUpdated?: number,
    error?: string
  }> {
    try {
      console.log('[GEOTAB] Starting database groups update...')
      
      let driversUpdated = 0
      let devicesUpdated = 0

      // Get driver and device data from cache only (no authentication needed)
      let driverData: any[] = []
      let deviceData: any[] = []
      let groupLookup: Map<string, string> = new Map() // Map of group ID to name

      // Check driver cache
      if (this.driverDataCache && this.driverDataCache.drivers) {
        driverData = this.driverDataCache.drivers
        console.log(`[GEOTAB] Using cached driver data: ${driverData.length} drivers`)
      }

      // Check device cache  
      if (this.deviceDataCache && this.deviceDataCache.devices) {
        deviceData = this.deviceDataCache.devices
        console.log(`[GEOTAB] Using cached device data: ${deviceData.length} devices`)
      }

      // Check group cache for name lookups
      if (this.groupDataCache && this.groupDataCache.groups) {
        const groupData = this.groupDataCache.groups
        console.log(`[GEOTAB] Using cached group data: ${groupData.length} groups for name lookups`)
        // Build lookup map
        for (const group of groupData) {
          if (group.id && group.name) {
            groupLookup.set(group.id, group.name)
          }
        }
      } else {
        console.log(`[GEOTAB] Warning: No group data cache available for name lookups - will store group IDs instead`)
      }

      if (driverData.length === 0 && deviceData.length === 0) {
        return {
          success: false,
          error: 'No cached driver or device data available. Please import GEOtab data first using the import buttons above.'
        }
      }

      // Get services
      const driversService = this.app.service('drivers')
      const fleetService = this.app.service('fleet')

      console.log(`[GEOTAB] Processing ${driverData.length} drivers and ${deviceData.length} devices`)

      // Debug: Check sample driver structure
      if (driverData.length > 0) {
        const sampleDriver = driverData[0]
        console.log(`[GEOTAB] Sample driver structure:`, {
          id: sampleDriver.id,
          name: sampleDriver.name,
          hasDriverGroups: !!sampleDriver.driverGroups,
          driverGroupsLength: sampleDriver.driverGroups ? sampleDriver.driverGroups.length : 0,
          keys: Object.keys(sampleDriver)
        })
      }

      // Update drivers with group information
      let driversWithGroups = 0
      let driversMatched = 0
      let driversCreated = 0
      let driversSkippedInactive = 0
      
      for (const geotabDriver of driverData) {
        try {
          // Check if driver is active (isActiveDriver flag)
          if (geotabDriver.isActiveDriver === false) {
            driversSkippedInactive++
            continue // Skip inactive drivers
          }

          if (geotabDriver.driverGroups && geotabDriver.driverGroups.length > 0) {
            driversWithGroups++
            // Extract group names from driverGroups array (convert IDs to names)
            const groupNames = geotabDriver.driverGroups.map((group: any) => 
              groupLookup.get(group.id) || group.id  // Use name if available, fallback to ID
            )
            
            // Find matching driver in database by geotab name/username
            // The database stores geotab username (like 'qdaniels'), not the ID
            const existingDrivers = await driversService.find({
              query: { geotab: geotabDriver.name, $limit: 1 }
            })

            if (existingDrivers.data && existingDrivers.data.length > 0) {
              // Update existing driver
              driversMatched++
              const driverId = existingDrivers.data[0]._id
              await driversService.patch(driverId, { groups: groupNames })
              driversUpdated++
              console.log(`[GEOTAB] Updated existing driver ${geotabDriver.name} with ${groupNames.length} groups: ${groupNames.join(', ')}`)
            } else {
              // Create new driver entry from Geotab data
              // Parse the first and last name from the keys field or use the name field
              let firstName = ''
              let lastName = ''
              
              // Try to get first and last name from keys field
              if (geotabDriver.keys && Array.isArray(geotabDriver.keys)) {
                const firstNameKey = geotabDriver.keys.find((k: any) => k.id === 'DriverFirstName')
                const lastNameKey = geotabDriver.keys.find((k: any) => k.id === 'DriverLastName')
                if (firstNameKey) firstName = firstNameKey.value || ''
                if (lastNameKey) lastName = lastNameKey.value || ''
              }
              
              // Fallback to parsing the name field if keys don't have names
              if (!firstName && !lastName && geotabDriver.name) {
                const nameParts = geotabDriver.name.split(' ')
                firstName = nameParts[0] || geotabDriver.name
                lastName = nameParts.slice(1).join(' ') || ''
              }
              
              // Extract license info from keys
              let licenseNumber = ''
              let licenseState = ''
              let operatingAuthority = ''
              
              if (geotabDriver.keys && Array.isArray(geotabDriver.keys)) {
                const licenseNumberKey = geotabDriver.keys.find((k: any) => k.id === 'DriverLicenseNumber')
                const licenseStateKey = geotabDriver.keys.find((k: any) => k.id === 'DriverLicenseProvince')
                const operatingAuthorityKey = geotabDriver.keys.find((k: any) => k.id === 'OperatingAuthority')
                
                if (licenseNumberKey) licenseNumber = licenseNumberKey.value || ''
                if (licenseStateKey) licenseState = licenseStateKey.value || ''
                if (operatingAuthorityKey) operatingAuthority = operatingAuthorityKey.value || ''
              }
              
              const newDriverData = {
                firstName: firstName || 'Unknown',
                lastName: lastName || '',
                geotab: geotabDriver.name, // Store the Geotab username/login
                groups: groupNames,
                licenseNumber: licenseNumber,
                licenseState: licenseState,
                operatingAuthority: operatingAuthority,
                status: 'Hired', // Default to Hired for active Geotab drivers
                worklist: 'Imported from Geotab', // Flag source
                driverId: geotabDriver.id // Store the Geotab ID separately
              }
              
              await driversService.create(newDriverData)
              driversCreated++
              driversUpdated++
              console.log(`[GEOTAB] Created new driver entry for ${geotabDriver.name} with groups: ${groupNames.join(', ')}`)
            }
          }
        } catch (error) {
          console.warn(`[GEOTAB] Failed to update/create driver ${geotabDriver.name}:`, error)
        }
      }
      
      console.log(`[GEOTAB] Driver stats: ${driversWithGroups} active drivers with groups, ${driversSkippedInactive} inactive drivers skipped, ${driversMatched} matched in database, ${driversCreated} new drivers created`)

      // Debug: Check sample device structure
      if (deviceData.length > 0) {
        const sampleDevice = deviceData[0]
        console.log(`[GEOTAB] Sample device structure:`, {
          id: sampleDevice.id,
          name: sampleDevice.name,
          serialNumber: sampleDevice.serialNumber,
          vehicleIdentificationNumber: sampleDevice.vehicleIdentificationNumber,
          activeFrom: sampleDevice.activeFrom,
          activeTo: sampleDevice.activeTo,
          hasGroups: !!sampleDevice.groups,
          groupsLength: sampleDevice.groups ? sampleDevice.groups.length : 0,
          keys: Object.keys(sampleDevice)
        })
      }

      // Update devices/fleet with group information
      let devicesWithGroups = 0
      let devicesMatched = 0
      let devicesSkippedInactive = 0
      let devicesSkippedNoVehicleGroup = 0
      
      for (const geotabDevice of deviceData) {
        try {
          // Check if device is active (activeTo date is later than current date)
          const now = new Date()
          const activeTo = geotabDevice.activeTo ? new Date(geotabDevice.activeTo) : null
          
          if (activeTo && activeTo <= now) {
            devicesSkippedInactive++
            continue // Skip inactive devices
          }
          
          if (geotabDevice.groups && geotabDevice.groups.length > 0) {
            devicesWithGroups++
            
            // Debug: Check structure of device groups
            if (devicesWithGroups === 1) {
              console.log(`[GEOTAB] First device group structure:`, JSON.stringify(geotabDevice.groups[0], null, 2))
            }
            
            // Convert device group IDs to names
            const deviceGroupNames = geotabDevice.groups.map((group: any) => {
              // Handle both object format {id: "..."} and string format "..."
              const groupId = typeof group === 'object' ? group.id : group
              return groupLookup.get(groupId) || groupId  // Use name if available, fallback to ID
            })
            
            // Find matching fleet entry by truck number (try truckNumber field first, fallback to name)
            const searchValue = geotabDevice.truckNumber || geotabDevice.name
            const existingFleet = await fleetService.find({
              query: { truckID: searchValue, $limit: 1 }
            })

            // Prepare update data with groups and license information
            const updateData: any = {
              groups: deviceGroupNames,
              vin: geotabDevice.vehicleIdentificationNumber || geotabDevice.vin,
              licensePlate: geotabDevice.licensePlate,
              licenseState: geotabDevice.licenseState
            }

            if (existingFleet.data && existingFleet.data.length > 0) {
              // Update existing fleet entry
              devicesMatched++
              const fleetId = existingFleet.data[0]._id
              await fleetService.patch(fleetId, updateData)
              devicesUpdated++
              console.log(`[GEOTAB] Updated existing fleet entry ${searchValue} with groups, VIN, and license data`)
            } else {
              // Only create new fleet entry if device has "Vehicle" in its groups
              if (deviceGroupNames.includes('Vehicle')) {
                const newFleetData = {
                  truckID: searchValue,
                  vehicleType: '??' as const, // Unknown type from Geotab
                  status: 'active' as const,
                  notes: `Auto-created from Geotab device: ${geotabDevice.name}`,
                  ...updateData
                }
                
                await fleetService.create(newFleetData)
                devicesUpdated++
                console.log(`[GEOTAB] Created new fleet entry for truckID: ${searchValue} (Geotab device: ${geotabDevice.name}) - has Vehicle group`)
              } else {
                devicesSkippedNoVehicleGroup++
                console.log(`[GEOTAB] Skipping fleet creation for device ${geotabDevice.name} - no "Vehicle" group found (groups: ${deviceGroupNames.join(', ')})`)
              }
            }
          }
        } catch (error) {
          console.warn(`[GEOTAB] Failed to update device ${geotabDevice.name}:`, error)
        }
      }
      
      const devicesCreated = devicesUpdated - devicesMatched
      console.log(`[GEOTAB] Device stats: ${devicesWithGroups} active devices with groups, ${devicesSkippedInactive} inactive devices skipped, ${devicesSkippedNoVehicleGroup} devices skipped (no Vehicle group), ${devicesMatched} matched existing fleet entries, ${devicesCreated} new fleet entries created`)

      console.log(`[GEOTAB] Database update complete: ${driversUpdated} drivers updated, ${devicesMatched} fleet entries updated, ${devicesCreated} new fleet entries created`)

      return {
        success: true,
        driversUpdated,
        devicesUpdated
      }

    } catch (error: any) {
      console.error('[GEOTAB] Error updating database groups:', error)
      return {
        success: false,
        error: error.message || 'Failed to update database groups'
      }
    }
  }
}