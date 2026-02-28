/**
 * Backend Route Calculation Utilities
 * 
 * Centralized route time and distance calculations for consistent results across the application.
 */

export interface RouteStop {
  _id?: string
  routeId: string
  sequence?: number
  latitude?: number
  longitude?: number
  eta?: string
  etd?: string
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
 * Routes start and end at terminal. Uses actual ETA/ETD when available, 
 * otherwise calculates from distance at 48mph.
 * @param routeStops Array of stops for the route
 * @param terminal Terminal object with coordinates and departure time
 * @param terminalETD Terminal departure time (if available)
 * @returns Duration in minutes
 */
export function calculateRouteTime(routeStops: RouteStop[], terminal?: Terminal, terminalETD?: string): number {
  if (routeStops.length === 0) {
    return 0
  }


  // Sort by sequence
  const sortedStops = routeStops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
  const firstStop = sortedStops[0]
  const lastStop = sortedStops.at(-1)

  let totalMinutes = 0

  // 1. Time from terminal departure to first stop
  if (terminalETD && firstStop?.eta) {
    // Use actual times
    const terminalDepartureMinutes = convertToMinutes(terminalETD)
    const firstStopArrivalMinutes = convertToMinutes(firstStop.eta)
    
    let segmentTime = firstStopArrivalMinutes - terminalDepartureMinutes
    if (segmentTime < 0) segmentTime += 24 * 60 // Handle day rollover
    
    totalMinutes += segmentTime
  } else if (terminal?.latitude && terminal?.longitude && firstStop?.latitude && firstStop?.longitude) {
    // Use distance calculation
    const distance = calculateDistance(
      terminal.latitude, terminal.longitude,
      firstStop.latitude, firstStop.longitude
    )
    const segmentTime = (distance / 48) * 60
    totalMinutes += segmentTime
  }

  // 2. Time between consecutive stops
  for (let i = 1; i < sortedStops.length; i++) {
    const prevStop = sortedStops[i - 1]
    const currentStop = sortedStops[i]

    if (prevStop.etd && currentStop.eta) {
      // Use actual times
      const departureMinutes = convertToMinutes(prevStop.etd)
      const arrivalMinutes = convertToMinutes(currentStop.eta)
      
      let segmentTime = arrivalMinutes - departureMinutes
      if (segmentTime < 0) segmentTime += 24 * 60 // Handle day rollover
      
      totalMinutes += segmentTime
    } else if (prevStop.latitude && prevStop.longitude && currentStop.latitude && currentStop.longitude) {
      // Use distance calculation
      const distance = calculateDistance(
        prevStop.latitude, prevStop.longitude,
        currentStop.latitude, currentStop.longitude
      )
      const segmentTime = (distance / 48) * 60
      totalMinutes += segmentTime
    }
  }

  // 3. Time from last stop back to terminal (always use distance since no terminal ETA)
  if (lastStop?.latitude && lastStop?.longitude && terminal?.latitude && terminal?.longitude) {
    const distance = calculateDistance(
      lastStop.latitude, lastStop.longitude,
      terminal.latitude, terminal.longitude
    )
    const segmentTime = (distance / 48) * 60
    totalMinutes += segmentTime
  }

  return Math.round(totalMinutes)
}


/**
 * Calculate estimated total distance for a route (round trip from terminal)
 * @param routeStops Array of stops for the route  
 * @param terminal Terminal object with coordinates
 * @returns Distance in miles
 */
export function calculateRouteDistance(routeStops: RouteStop[], terminal?: Terminal): number {
  if (routeStops.length === 0) {
    return 0
  }


  // Check if terminal has GPS coordinates
  if (!terminal?.latitude || !terminal?.longitude) {
    return 0
  }

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
    return 0 // Can't calculate without first stop coordinates
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
    return 0 // Can't calculate without last stop coordinates
  }

  return totalDistance
}