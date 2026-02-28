/**
 * Custom hooks for routes service to populate stops and calculate estimations
 */

import type { HookContext } from '../../declarations'
import { calculateRouteTime, calculateRouteDistance, calculateDistance, convertToMinutes, formatDuration, type RouteStop, type Terminal } from '../../utils/route-calculations'
import type { RouteService } from './routes.class'

/**
 * Hook to populate route stops and calculate estimated times/distances
 * Runs after get/find operations to enrich route data
 */
export const populateRouteData = async (context: HookContext<RouteService>) => {
  const { app, result } = context

  if (!result) {
    return context
  }

  // Handle both single route (get) and array of routes (find)
  const routes = Array.isArray(result) ? result : (result as any).data ? (result as any).data : [result]
  
  if (!routes || routes.length === 0) {
    return context
  }

  try {
    // Get services
    const routeStopsService = app.service('route-stops')
    const terminalsService = app.service('terminals')

    // Process each route
    for (const route of routes) {
      if (!route._id) continue


      // 1. Get terminal data first if terminalId exists
      let terminal: Terminal | null = null
      if (route.terminalId) {
        try {
          const terminalResult = await terminalsService.get(route.terminalId as string)
          terminal = terminalResult as Terminal
        } catch (error) {
          console.warn(`Could not load terminal ${route.terminalId} for route ${route.trkid}:`, error)
        }
      }

      // 2. Get route stops
      const stopsResult = await routeStopsService.find({
        query: { routeId: route._id },
        paginate: false
      })
      
      const regularStops = Array.isArray(stopsResult) ? stopsResult : (stopsResult as any).data || []
      
      // Sort regular stops by sequence
      const sortedRegularStops = regularStops.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))

      // 3. Build complete stops array including terminal start and end
      const stops = []

      if (terminal && sortedRegularStops.length > 0) {
        // Create terminal start stop (sequence 0)
        const terminalStartStop = {
          _id: 'terminal-start',
          routeId: route._id,
          sequence: 0,
          eta: '', // No ETA for starting terminal
          etd: route.departureTime || '', // Use route departure time
          commitTime: '',
          fixedTime: null,
          cube: null,
          timeZone: '',
          lanterID: '',
          customerPDC: '',
          cid: '',
          custName: terminal.name || 'Terminal',
          address: (terminal as any).streetAddress || '',
          city: terminal.city || '',
          state: terminal.state || '',
          zipCode: (terminal as any).zip || '',
          openTime: '',
          closeTime: '',
          latitude: terminal.latitude,
          longitude: terminal.longitude,
          geoResult: '',
          isTerminal: true,
          isStart: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Segment calculations (none for first stop)
          segmentDistance: null,
          segmentDuration: null,
          segmentDistanceFormatted: 'N/A',
          segmentDurationFormatted: 'N/A'
        }
        stops.push(terminalStartStop)

        // Add all regular stops with initialized segment properties
        for (const regularStop of sortedRegularStops) {
          stops.push({
            ...regularStop,
            // Initialize segment properties (will be calculated below)
            segmentDistance: null,
            segmentDuration: null,
            segmentDistanceFormatted: 'N/A',
            segmentDurationFormatted: 'N/A'
          })
        }

        // Create terminal end stop (sequence = last stop + 1)
        const lastSequence = Math.max(...sortedRegularStops.map((s: any) => s.sequence || 0))
        const terminalEndStop = {
          _id: 'terminal-end',
          routeId: route._id,
          sequence: lastSequence + 1,
          eta: '', // ETA will be calculated based on last stop + travel time
          etd: '', // No ETD for ending terminal
          commitTime: '',
          fixedTime: null,
          cube: null,
          timeZone: '',
          lanterID: '',
          customerPDC: '',
          cid: '',
          custName: terminal.name || 'Terminal',
          address: (terminal as any).streetAddress || '',
          city: terminal.city || '',
          state: terminal.state || '',
          zipCode: (terminal as any).zip || '',
          openTime: '',
          closeTime: '',
          latitude: terminal.latitude,
          longitude: terminal.longitude,
          geoResult: '',
          isTerminal: true,
          isEnd: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Segment calculations (will be calculated below)
          segmentDistance: null,
          segmentDuration: null,
          segmentDistanceFormatted: '',
          segmentDurationFormatted: ''
        }
        stops.push(terminalEndStop)
      } else {
        // No terminal available, just use regular stops with initialized segment properties
        for (const regularStop of sortedRegularStops) {
          stops.push({
            ...regularStop,
            // Initialize segment properties (will be calculated below)
            segmentDistance: null,
            segmentDuration: null,
            segmentDistanceFormatted: 'N/A',
            segmentDurationFormatted: 'N/A'
          })
        }
      }

      // 4. Calculate segment distances and durations for each stop
      for (let i = 0; i < stops.length; i++) {
        const currentStop = stops[i]
        
        if (i === 0) {
          // First stop (terminal) has no segment data
          currentStop.segmentDistance = null
          currentStop.segmentDuration = null
          currentStop.segmentDistanceFormatted = 'N/A'
          currentStop.segmentDurationFormatted = 'N/A'
        } else {
          // All other stops: calculate segment from previous stop
          const prevStop = stops[i - 1]
          
          // Calculate segment distance
          let segmentDistance = 0
          let segmentDistanceFormatted = 'N/A'
          
          if (prevStop.latitude && prevStop.longitude && currentStop.latitude && currentStop.longitude) {
            segmentDistance = calculateDistance(
              prevStop.latitude,
              prevStop.longitude, 
              currentStop.latitude,
              currentStop.longitude
            )
            segmentDistanceFormatted = segmentDistance.toFixed(1)
          }
          
          // Calculate segment duration
          let segmentDuration = 0 // in minutes
          let segmentDurationFormatted = 'N/A'
          
          // Try to use actual timing data first
          const prevETD = convertToMinutes(prevStop.etd)
          const currentETA = convertToMinutes(currentStop.eta)
          
          if (prevETD > 0 && currentETA > 0) {
            // Use actual times
            segmentDuration = currentETA - prevETD
            if (segmentDuration < 0) segmentDuration += 24 * 60 // Handle day rollover
            segmentDurationFormatted = formatDuration(segmentDuration)
          } else if (segmentDistance > 0) {
            // Fall back to distance-based estimate at 48 mph
            segmentDuration = Math.round((segmentDistance / 48) * 60)
            segmentDurationFormatted = formatDuration(segmentDuration)
          } else {
            // No timing or distance data available
            segmentDuration = 0
            segmentDurationFormatted = 'N/A'
          }
          
          // Add segment data to current stop
          currentStop.segmentDistance = segmentDistance
          currentStop.segmentDuration = segmentDuration
          currentStop.segmentDistanceFormatted = segmentDistanceFormatted
          currentStop.segmentDurationFormatted = segmentDurationFormatted
        }
      }

      // 5. Calculate estimates
      const timeResult = calculateRouteTime(stops as RouteStop[], terminal || undefined, route.departureTime)
      const distanceResult = calculateRouteDistance(stops as RouteStop[], terminal || undefined)

      // 6. Update route object (calculated fields only, not persisted)
      route.stops = stops
      route.totalStops = stops.length // Calculated dynamically, not stored in DB
      route.estimatedDuration = timeResult
      route.estimatedDistance = distanceResult
    }

  } catch (error) {
    console.error('Error in populateRouteData hook:', error)
    // Don't throw error - just log it and continue without populated data
  }

  return context
}

