/**
 * Custom hooks for route-executions service
 */

import type { HookContext } from '../../declarations'
import type { RouteExecutionService } from './route-executions.class'

/**
 * Hook to validate route execution data before creation
 * Ensures compound key uniqueness (routeId + executionDate)
 */
export const validateRouteExecution = async (context: HookContext<RouteExecutionService>) => {
  const { app, data } = context

  // Handle both single object and array
  const routeExecutionData = Array.isArray(data) ? data[0] : data
  
  if (!routeExecutionData || !routeExecutionData.routeId || !routeExecutionData.executionDate) {
    throw new Error('RouteId and executionDate are required for route execution')
  }

  // Check if a route execution already exists for this route and date
  const existingExecutions = await app.service('route-executions').find({
    query: {
      routeId: routeExecutionData.routeId,
      executionDate: routeExecutionData.executionDate,
      $limit: 1
    }
  })

  const executions = Array.isArray(existingExecutions) ? existingExecutions : (existingExecutions as any).data || []
  
  if (executions.length > 0 && context.method === 'create') {
    throw new Error(`Route execution already exists for route ${routeExecutionData.routeId} on ${routeExecutionData.executionDate}`)
  }

  return context
}

/**
 * Hook to populate route execution with initial stop data from route-stops
 * Only runs when creating a new route execution
 */
export const populateInitialStops = async (context: HookContext<RouteExecutionService>) => {
  const { app, data, method } = context

  // Handle both single object and array
  const routeExecutionData = Array.isArray(data) ? data[0] : data

  // Only populate on create and if stops array is empty or not provided
  if (method !== 'create' || !routeExecutionData || (routeExecutionData.stops && routeExecutionData.stops.length > 0)) {
    return context
  }

  if (!routeExecutionData.routeId) {
    return context
  }

  try {
    // Get the route to ensure it exists
    const route = await app.service('routes').get(routeExecutionData.routeId as string)
    if (!route) {
      throw new Error(`Route ${routeExecutionData.routeId} not found`)
    }

    // Get route stops for this route
    const stopsResult = await app.service('route-stops').find({
      query: { 
        routeId: routeExecutionData.routeId,
        $limit: 1000
      },
      paginate: false
    })
    
    const routeStops = Array.isArray(stopsResult) ? stopsResult : (stopsResult as any).data || []
    
    if (routeStops.length === 0) {
      // No stops found - initialize with empty array
      routeExecutionData.stops = []
      return context
    }

    // Sort stops by sequence
    const sortedStops = routeStops.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))

    // Create initial stop execution records with pending status
    routeExecutionData.stops = sortedStops.map((stop: any) => ({
      stopId: stop._id,
      sequence: stop.sequence,
      plannedETA: stop.eta,
      plannedETD: stop.etd,
      status: 'pending'
      // Optional fields are omitted rather than set to null to comply with schema
    }))

    console.log(`[ROUTE-EXECUTIONS] Populated ${routeExecutionData.stops.length} initial stops for route execution ${routeExecutionData.routeId} on ${routeExecutionData.executionDate}`)

  } catch (error) {
    console.error('Error in populateInitialStops hook:', error)
    // Initialize with empty stops array if there's an error
    routeExecutionData.stops = []
  }

  return context
}

/**
 * Hook to calculate performance metrics when stop data is updated
 * Runs after patch operations to update calculated fields
 */
export const calculatePerformanceMetrics = async (context: HookContext<RouteExecutionService>) => {
  const { result } = context

  // Handle different result types
  const routeExecution = Array.isArray(result) ? result[0] : 
                        (result as any).data ? (result as any).data[0] : result

  if (!routeExecution || !routeExecution.stops) {
    return context
  }

  try {
    const stops = routeExecution.stops
    let totalServiceTime = 0
    let onTimeCount = 0
    let completedStopsCount = 0

    // Calculate metrics from stop data
    for (const stop of stops) {
      if (stop.status === 'completed') {
        completedStopsCount++
        
        // Add service time if available
        if (stop.serviceTime) {
          totalServiceTime += stop.serviceTime
        }
        
        // Count on-time performance
        if (stop.onTimeStatus === 'on-time') {
          onTimeCount++
        }
      }
    }

    // Calculate on-time performance percentage
    const onTimePerformance = completedStopsCount > 0 ? 
      Math.round((onTimeCount / completedStopsCount) * 100) : 0

    // DISABLED: Performance metrics auto-update to prevent infinite recursion
    // The recursive patch calls were causing infinite loops
    // Performance metrics will need to be calculated on-demand or through a different mechanism
    console.log(`[ROUTE-EXECUTIONS] Performance metrics calculated but not auto-saved: ${onTimePerformance}% on-time, ${totalServiceTime} min service time`)

  } catch (error) {
    console.error('Error calculating performance metrics:', error)
    // Rethrow error to ensure client receives it
    throw error
  }

  return context
}

/**
 * Hook to update route execution status based on stop statuses
 * Automatically determines if route is in-progress, completed, etc.
 */
export const updateExecutionStatus = async (context: HookContext<RouteExecutionService>) => {
  const { result } = context

  // Handle different result types
  const routeExecution = Array.isArray(result) ? result[0] : 
                        (result as any).data ? (result as any).data[0] : result

  if (!routeExecution || !routeExecution.stops) {
    return context
  }

  try {
    const stops = routeExecution.stops
    const totalStops = stops.length
    
    if (totalStops === 0) {
      return context
    }

    // Count stop statuses
    const pendingCount = stops.filter((s: any) => s.status === 'pending').length
    const completedCount = stops.filter((s: any) => s.status === 'completed').length
    const exceptionCount = stops.filter((s: any) => s.status === 'exception').length
    const arrivedCount = stops.filter((s: any) => s.status === 'arrived').length

    let newStatus = routeExecution.status
    let actualCompletionTime = routeExecution.actualCompletionTime

    // Determine new status based on stop states
    if (completedCount === totalStops) {
      // All stops completed
      newStatus = 'completed'
      if (!actualCompletionTime) {
        actualCompletionTime = new Date().toISOString()
      }
    } else if (exceptionCount > 0) {
      // Has exceptions
      newStatus = 'exception'
    } else if (arrivedCount > 0 || completedCount > 0) {
      // Some stops started
      newStatus = 'in-progress'
    } else if (pendingCount === totalStops) {
      // All stops still pending
      if (routeExecution.status !== 'scheduled' && routeExecution.status !== 'cancelled') {
        newStatus = 'scheduled'
      }
    }

    // Update status if it changed
    if (newStatus !== routeExecution.status || actualCompletionTime !== routeExecution.actualCompletionTime) {
      if (context.method === 'patch' && context.id) {
        await context.app.service('route-executions').patch(context.id, {
          status: newStatus,
          actualCompletionTime,
          updatedAt: new Date().toISOString()
        })
      }
      
      console.log(`[ROUTE-EXECUTIONS] Updated execution status to: ${newStatus}`)
    }

  } catch (error) {
    console.error('Error updating execution status:', error)
    // Rethrow error to ensure client receives it
    throw error
  }

  return context
}

/**
 * Hook to integrate Geotab data into route execution stops
 * Updates stop records with real-time GPS tracking information
 */
export const integrateGeotabData = async (context: HookContext<RouteExecutionService>) => {
  const { app, result, method } = context

  // Only run on patch operations (when stops are being updated)
  if (method !== 'patch') {
    return context
  }

  // Handle different result types
  const routeExecution = Array.isArray(result) ? result[0] : 
                        (result as any).data ? (result as any).data[0] : result

  if (!routeExecution || !routeExecution.stops || !routeExecution.routeId) {
    return context
  }

  try {
    console.log(`[GEOTAB-INTEGRATION] Processing route execution ${routeExecution.routeId} on ${routeExecution.executionDate}`)
    
    // Get the route details to find truck/driver assignments
    const route = await app.service('routes').get(routeExecution.routeId)
    if (!route) {
      console.warn(`[GEOTAB-INTEGRATION] Route ${routeExecution.routeId} not found`)
      return context
    }

    // Check for Geotab authentication from environment variables
    const geotabDatabase = process.env.GEOTAB_DATABASE
    const geotabUsername = process.env.GEOTAB_USERNAME
    const geotabPassword = process.env.GEOTAB_PASSWORD

    if (!geotabDatabase || !geotabUsername || !geotabPassword) {
      console.log('[GEOTAB-INTEGRATION] Geotab credentials not configured, skipping integration')
      return context
    }

    const geotabAuth = {
      database: geotabDatabase,
      username: geotabUsername,
      password: geotabPassword
    }

    // Get vehicle status from Geotab
    const geotabService = app.service('geotab')
    const routeProgress = await geotabService.getRouteProgress({
      truckNumber: route.truckNumber || routeExecution.truckNumber,
      driverGeotabId: (route as any).driverGeotabId, // Type assertion since this might not be in schema yet
      routeId: routeExecution.routeId,
      authData: geotabAuth
    })

    if (!routeProgress.success || !routeProgress.vehicleStatus) {
      console.warn(`[GEOTAB-INTEGRATION] Could not get vehicle status: ${routeProgress.error}`)
      return context
    }

    const vehicleStatus = routeProgress.vehicleStatus

    // Check if we need to update stop statuses based on GPS location
    const updatedStops = await Promise.all(routeExecution.stops.map(async (stop: any) => {
      // Skip if stop already completed or doesn't have location data
      if (stop.status === 'completed' || !stop.stopLocation) {
        return stop
      }

      // Calculate if vehicle is near this stop location
      if (vehicleStatus.location && stop.stopLocation.latitude && stop.stopLocation.longitude) {
        const distance = calculateDistance(
          vehicleStatus.location.latitude,
          vehicleStatus.location.longitude,
          stop.stopLocation.latitude,
          stop.stopLocation.longitude
        )

        const updatedStop = { ...stop }

        // If within 100 meters of stop and currently pending
        if (distance <= 0.1 && stop.status === 'pending') { // 0.1 km = 100 meters
          updatedStop.status = 'arrived'
          updatedStop.actualArrivalTime = new Date().toISOString()
          
          // Calculate on-time status
          if (stop.plannedETA) {
            const plannedTime = new Date(stop.plannedETA).getTime()
            const actualTime = new Date(updatedStop.actualArrivalTime).getTime()
            const diffMinutes = (actualTime - plannedTime) / (1000 * 60)
            
            if (diffMinutes <= 15) { // Within 15 minutes is considered on-time
              updatedStop.onTimeStatus = 'on-time'
            } else if (diffMinutes <= 30) {
              updatedStop.onTimeStatus = 'delayed'
            } else {
              updatedStop.onTimeStatus = 'late'
            }
          }
        }

        // Update Geotab data
        updatedStop.geotabData = {
          deviceId: vehicleStatus.deviceId,
          deviceName: vehicleStatus.deviceName,
          currentLocation: vehicleStatus.location,
          speed: vehicleStatus.speed,
          isDriving: vehicleStatus.isDriving,
          bearing: vehicleStatus.bearing,
          lastUpdate: vehicleStatus.lastUpdate,
          distanceFromStop: Math.round(distance * 1000), // Convert to meters
          distanceTraveled: vehicleStatus.distanceTraveled,
          estimatedCompletion: vehicleStatus.estimatedCompletion
        }

        console.log(`[GEOTAB-INTEGRATION] Updated stop ${stop.sequence}: status=${updatedStop.status}, distance=${Math.round(distance * 1000)}m`)

        return updatedStop
      }

      return stop
    }))

    // Update the route execution if any stops were modified
    const hasChanges = updatedStops.some((stop, index) => 
      JSON.stringify(stop) !== JSON.stringify(routeExecution.stops[index])
    )

    if (hasChanges && context.id) {
      await app.service('route-executions').patch(context.id, {
        stops: updatedStops,
        updatedAt: new Date().toISOString()
      })

      console.log(`[GEOTAB-INTEGRATION] Updated route execution ${routeExecution.routeId} with Geotab data`)
    }

  } catch (error) {
    console.error('[GEOTAB-INTEGRATION] Error integrating Geotab data:', error)
    // Don't throw - Geotab integration errors shouldn't break core functionality
  }

  return context
}

/**
 * Helper function to calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}