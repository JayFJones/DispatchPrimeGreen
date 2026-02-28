/**
 * Terminal URL Helper Functions
 *
 * Provides utilities to convert between terminal ObjectIDs and human-readable URL-safe identifiers
 */

export interface Terminal {
  _id: string
  name: string
  city?: string
  state?: string
  dcp?: string
}

/**
 * Converts a terminal name to a URL-safe identifier
 * Examples:
 * - "Louisville Terminal" -> "LOUISVILLE-TERMINAL"
 * - "Louisville, KY" -> "LOUISVILLE-KY"
 * - "Memphis Distribution Center" -> "MEMPHIS-DISTRIBUTION-CENTER"
 * - "Chicago O'Hare" -> "CHICAGO-OHARE"
 */
export function terminalToUrlId (terminal: Terminal): string {
  if (!terminal.name) {
    throw new Error('Terminal name is required')
  }

  // Start with terminal name
  let urlId = terminal.name

  // Remove special characters and normalize
  urlId = urlId
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .toUpperCase() // Convert to uppercase

  // Only add city/state if they're not already in the name and the name doesn't seem location-specific
  if (terminal.city && terminal.state) {
    const nameUpper = urlId.toUpperCase()
    const cityUpper = terminal.city.toUpperCase()
    const stateUpper = terminal.state.toUpperCase()

    // Check if city or state are already in the name
    const hasCityOrState = nameUpper.includes(cityUpper) || nameUpper.includes(stateUpper)

    // If no location info in name, add city-state
    if (!hasCityOrState) {
      urlId = `${urlId}-${cityUpper}-${stateUpper}`
    }
  }

  // Ensure it's not empty
  if (!urlId) {
    urlId = `TERMINAL-${terminal._id.slice(-6).toUpperCase()}`
  }

  return urlId
}

/**
 * Finds a terminal by its URL-safe identifier
 * Returns the terminal object if found, null otherwise
 */
export function findTerminalByUrlId (terminals: Terminal[], urlId: string): Terminal | null {
  if (!urlId || terminals.length === 0) {
    return null
  }

  // First try to find by exact URL ID match
  for (const terminal of terminals) {
    if (terminalToUrlId(terminal) === urlId.toUpperCase()) {
      return terminal
    }
  }

  // If no exact match, try partial matching
  const searchTerm = urlId.replace(/-/g, ' ').toLowerCase()

  for (const terminal of terminals) {
    const terminalName = terminal.name?.toLowerCase() || ''
    const terminalCity = terminal.city?.toLowerCase() || ''
    const terminalState = terminal.state?.toLowerCase() || ''

    if (terminalName.includes(searchTerm)
      || terminalCity.includes(searchTerm)
      || terminalState.includes(searchTerm)
      || `${terminalCity} ${terminalState}`.includes(searchTerm)) {
      return terminal
    }
  }

  return null
}

/**
 * Gets the ObjectID from a URL-safe terminal identifier
 * Returns the ObjectID if found, null otherwise
 */
export function getTerminalObjectId (terminals: Terminal[], urlId: string): string | null {
  const terminal = findTerminalByUrlId(terminals, urlId)
  return terminal?._id || null
}

/**
 * Creates a mapping of URL IDs to ObjectIDs for quick lookup
 */
export function createTerminalUrlIdMap (terminals: Terminal[]): Map<string, string> {
  const map = new Map<string, string>()

  for (const terminal of terminals) {
    try {
      const urlId = terminalToUrlId(terminal)
      map.set(urlId, terminal._id)
    } catch (error) {
      console.warn(`Failed to create URL ID for terminal ${terminal._id}:`, error)
    }
  }

  return map
}

/**
 * Creates a reverse mapping of ObjectIDs to URL IDs for quick lookup
 */
export function createTerminalObjectIdMap (terminals: Terminal[]): Map<string, string> {
  const map = new Map<string, string>()

  for (const terminal of terminals) {
    try {
      const urlId = terminalToUrlId(terminal)
      map.set(terminal._id, urlId)
    } catch (error) {
      console.warn(`Failed to create URL ID for terminal ${terminal._id}:`, error)
    }
  }

  return map
}
