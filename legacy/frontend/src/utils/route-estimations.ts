/**
 * Route Estimation Utilities
 * 
 * Shared functions for calculating route times and distances across the application.
 * Extracted from dispatch and terminals pages to provide consistent estimation logic.
 */

export interface RouteStop {
  _id?: string
  routeId: string
  sequence?: number
  latitude?: number
  longitude?: number
  eta?: any
  etd?: any
  commitTime?: string
}

export interface Terminal {
  _id?: string
  name: string
  latitude?: number
  longitude?: number
  city?: string
  state?: string
}

export interface Route {
  _id: string
  trkid: string
  terminalId?: string
  totalStops?: number
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point  
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Convert time value to minutes for calculations
 * @param timeValue Time value (number as decimal hours, string time format, or other)
 * @returns Minutes as number
 */
export function convertToMinutes(timeValue: any): number {
  if (typeof timeValue === 'number') {
    // Assuming decimal hours format (e.g., 14.5 = 14:30)
    const hours = Math.floor(timeValue)
    const minutes = Math.round((timeValue - hours) * 60)
    return hours * 60 + minutes
  }
  
  if (typeof timeValue === 'string' && timeValue.trim()) {
    // Handle string formats like "HH:MM", "H:MM", or decimal as string
    const trimmed = timeValue.trim()
    
    // Check if it's a time format with colon (e.g., "14:30", "8:15")
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':')
      if (parts.length === 2) {
        const hours = parseInt(parts[0], 10) || 0
        const minutes = parseInt(parts[1], 10) || 0
        return hours * 60 + minutes
      }
    }
    
    // Check if it's a decimal number as string (e.g., "14.5")
    const parsed = parseFloat(trimmed)
    if (!isNaN(parsed)) {
      const hours = Math.floor(parsed)
      const minutes = Math.round((parsed - hours) * 60)
      return hours * 60 + minutes
    }
  }
  
  return 0
}

/**
 * Format time duration for display
 * @param minutes Duration in minutes
 * @returns Formatted string like "2h 30m" or "45m"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'N/A'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  return `${mins}m`
}

/**
 * Calculate estimated time for a route based on stops and distances
 * @param routeStops Array of stops for the route
 * @param terminal Terminal object with coordinates (optional for distance calculations)
 * @returns Formatted time string or 'N/A'
 */
export function getEstimatedRouteTime(routeStops: RouteStop[], terminal?: Terminal): string {
  if (routeStops.length === 0) return 'N/A'

  // Sort by sequence
  const sortedStops = routeStops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  const firstStop = sortedStops[0]
  const lastStop = sortedStops.at(-1)

  // If we have both ETA and ETD, use actual times
  if (firstStop?.eta && lastStop?.etd) {
    const startMinutes = convertToMinutes(firstStop.eta)
    const endMinutes = convertToMinutes(lastStop.etd)
    
    if (startMinutes > 0 && endMinutes > 0) {
      let duration = endMinutes - startMinutes
      if (duration < 0) duration += 24 * 60 // Handle day rollover
      return formatDuration(duration)
    }
  }

  // Fall back to distance-based estimation
  return calculateTimeFromDistance(sortedStops, terminal)
}

/**
 * Calculate estimated time based on distances between stops at 48 mph average
 * @param sortedStops Array of stops sorted by sequence
 * @param terminal Terminal object with coordinates (optional)
 * @param averageSpeed Average speed in mph (default: 48)
 * @returns Formatted time string or 'N/A'
 */
function calculateTimeFromDistance(sortedStops: RouteStop[], terminal?: Terminal, averageSpeed: number = 48): string {
  if (sortedStops.length === 0) return 'N/A'

  let totalDistanceMinutes = 0
  let hasValidCoordinates = false

  // 1. Time from terminal to first stop (if terminal coordinates available)
  if (terminal?.latitude && terminal?.longitude && sortedStops[0]?.latitude && sortedStops[0]?.longitude) {
    const terminalToFirstDistance = calculateDistance(
      terminal.latitude,
      terminal.longitude,
      sortedStops[0].latitude,
      sortedStops[0].longitude
    )
    totalDistanceMinutes += (terminalToFirstDistance / averageSpeed) * 60
    hasValidCoordinates = true
  }

  // 2. Time between consecutive stops
  for (let i = 1; i < sortedStops.length; i++) {
    const prevStop = sortedStops[i - 1]
    const currentStop = sortedStops[i]

    if (prevStop.latitude && prevStop.longitude && currentStop.latitude && currentStop.longitude) {
      const distance = calculateDistance(
        prevStop.latitude,
        prevStop.longitude,
        currentStop.latitude,
        currentStop.longitude
      )
      totalDistanceMinutes += (distance / averageSpeed) * 60
      hasValidCoordinates = true
    }
  }

  // 3. Time from last stop back to terminal (if terminal coordinates available)
  const lastStop = sortedStops.at(-1)
  if (terminal?.latitude && terminal?.longitude && lastStop?.latitude && lastStop?.longitude) {
    const lastToTerminalDistance = calculateDistance(
      lastStop.latitude,
      lastStop.longitude,
      terminal.latitude,
      terminal.longitude
    )
    totalDistanceMinutes += (lastToTerminalDistance / averageSpeed) * 60
    hasValidCoordinates = true
  }

  if (!hasValidCoordinates) {
    return 'N/A'
  }

  // Add estimated time for stops (assume 15 minutes per stop)
  const stopTimeMinutes = sortedStops.length * 15

  const totalMinutes = Math.round(totalDistanceMinutes + stopTimeMinutes)
  return formatDuration(totalMinutes)
}

/**
 * Calculate estimated total distance for a route (round trip from terminal)
 * @param routeStops Array of stops for the route  
 * @param terminal Terminal object with coordinates
 * @returns Formatted distance string or 'N/A'
 */
export function getEstimatedRouteDistance(routeStops: RouteStop[], terminal: Terminal): string {
  if (routeStops.length === 0) return 'N/A'

  // Check if terminal has GPS coordinates
  if (!terminal?.latitude || !terminal?.longitude) return 'N/A'

  // Sort by sequence
  const sortedStops = routeStops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

  let totalDistance = 0
  const hubLat = terminal.latitude
  const hubLon = terminal.longitude

  // 1. Distance from hub to first stop
  const firstStop = sortedStops[0]
  if (firstStop?.latitude && firstStop?.longitude) {
    const hubToFirstDistance = calculateDistance(
      hubLat,
      hubLon,
      firstStop.latitude,
      firstStop.longitude
    )
    totalDistance += hubToFirstDistance
  } else {
    return 'N/A' // Can't calculate without first stop coordinates
  }

  // 2. Distance between consecutive stops
  for (let i = 1; i < sortedStops.length; i++) {
    const prevStop = sortedStops[i - 1]
    const currentStop = sortedStops[i]

    if (prevStop.latitude && prevStop.longitude && currentStop.latitude && currentStop.longitude) {
      const distance = calculateDistance(
        prevStop.latitude,
        prevStop.longitude,
        currentStop.latitude,
        currentStop.longitude
      )
      totalDistance += distance
    }
  }

  // 3. Distance from last stop back to hub
  const lastStop = sortedStops.at(-1)
  if (lastStop?.latitude && lastStop?.longitude) {
    const lastToHubDistance = calculateDistance(
      lastStop.latitude,
      lastStop.longitude,
      hubLat,
      hubLon
    )
    totalDistance += lastToHubDistance
  } else {
    return 'N/A' // Can't calculate without last stop coordinates
  }

  return totalDistance > 0 ? `${totalDistance.toFixed(1)} mi` : 'N/A'
}

/**
 * Calculate estimated return time to terminal based on distance and average speed
 * @param lastStopETD ETD of the last stop
 * @param lastStopLat Latitude of last stop
 * @param lastStopLon Longitude of last stop  
 * @param terminalLat Terminal latitude
 * @param terminalLon Terminal longitude
 * @param averageSpeed Average speed in mph (default: 48)
 * @returns Estimated return time string
 */
export function calculateEstimatedReturnTime(
  lastStopETD: any,
  lastStopLat: number,
  lastStopLon: number,
  terminalLat: number,
  terminalLon: number,
  averageSpeed: number = 48
): string {
  if (!lastStopETD || !lastStopLat || !lastStopLon || !terminalLat || !terminalLon) {
    return ''
  }

  try {
    // Calculate return distance
    const returnDistance = calculateDistance(
      lastStopLat,
      lastStopLon,
      terminalLat,
      terminalLon
    )

    // Calculate return time in minutes
    const returnTimeMinutes = Math.round((returnDistance / averageSpeed) * 60)

    // Convert last stop ETD to minutes
    const lastETDMinutes = convertToMinutes(lastStopETD)

    // Add return travel time
    const returnETAMinutes = lastETDMinutes + returnTimeMinutes

    // Convert back to time format
    const hours = Math.floor(returnETAMinutes / 60) % 24
    const minutes = returnETAMinutes % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch {
    return ''
  }
}