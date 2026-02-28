import { defineStore } from 'pinia'

export interface PendingChange {
  type: 'schedule' | 'cancel' | 'driver-assignment' | 'truck-assignment' | 'combined-assignment' | 'driver-substitution' | 'truck-substitution'
  routeId: string
  dayOfWeek?: number // Optional for new date-based substitutions
  executionDate?: string
  assignedDriverId?: string
  assignedTruckId?: string
  assignedTruckNumber?: string
  truckType?: string
  driverName?: string
  driverId?: string
  status?: string
  priority?: string
  isLongTermDriver?: boolean
  isLongTermTruck?: boolean
  longTermStartDate?: string // The earliest date this long-term substitution should apply
  longTermEndDate?: string // The latest date this long-term substitution should apply (optional)
  originalPlanned?: any
  // New properties for date-based substitutions
  startDate?: string
  endDate?: string
}

export interface PlanningState {
  pendingChanges: Map<string, PendingChange>
  currentWeekStart: string
  isGeneratingChanges: boolean
}

export const usePlanningStore = defineStore('planning', {
  state: (): PlanningState => ({
    pendingChanges: new Map<string, PendingChange>(),
    currentWeekStart: getStartOfWeek(new Date()).toISOString(),
    isGeneratingChanges: false,
  }),

  getters: {
    hasPendingChanges: state => state.pendingChanges.size > 0,

    getPendingChange: state => (key: string) => state.pendingChanges.get(key),

    getAllPendingChanges: state => Array.from(state.pendingChanges.entries()),

    getChangesList: state => {
      const changes: any[] = []

      for (const [key, change] of state.pendingChanges.entries()) {
        const [routeId, dayOfWeek] = key.split('-')
        const weekStart = new Date(state.currentWeekStart)
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + Number.parseInt(dayOfWeek))

        changes.push({
          key,
          date: date.toISOString().split('T')[0],
          routeId,
          dayOfWeek: Number.parseInt(dayOfWeek),
          changeType: change.type === 'truck-assignment'
            ? 'Truck'
            : (change.type === 'driver-assignment' ? 'Driver' : 'Truck & Driver'),
          change,
        })
      }

      return changes.sort((a, b) => a.date.localeCompare(b.date))
    },
  },

  actions: {
    // Initialize from sessionStorage
    initializeFromSession () {
      try {
        const storedData = sessionStorage.getItem('planning-store')
        if (storedData) {
          const parsed = JSON.parse(storedData)
          if (parsed.pendingChanges) {
            // Convert array back to Map
            this.pendingChanges = new Map(parsed.pendingChanges)
          }
          if (parsed.currentWeekStart) {
            this.currentWeekStart = parsed.currentWeekStart
          }
          // Reset generation flag on initialization
          this.isGeneratingChanges = false
        }
      } catch (error) {
        console.warn('Failed to restore planning state from session storage:', error)
        this.clearAllChanges()
      }
    },

    // Persist to sessionStorage
    persistToSession () {
      try {
        const dataToStore = {
          pendingChanges: Array.from(this.pendingChanges.entries()),
          currentWeekStart: this.currentWeekStart,
          isGeneratingChanges: false, // Don't persist the generation flag
        }
        sessionStorage.setItem('planning-store', JSON.stringify(dataToStore))
      } catch (error) {
        console.warn('Failed to persist planning state to session storage:', error)
      }
    },

    // Set the current week
    setCurrentWeek (weekStart: Date) {
      this.currentWeekStart = weekStart.toISOString()
      this.persistToSession()
    },

    // Add or update a pending change
    setPendingChange (key: string, change: PendingChange) {
      // If this is a long-term substitution, handle splitting existing ones
      if ((change.isLongTermDriver || change.isLongTermTruck)
        && change.longTermStartDate
        && !this.isGeneratingChanges) {
        this.handleLongTermSubstitutionSplit(change)
      }

      this.pendingChanges.set(key, change)
      this.persistToSession()

      // Long-term substitutions will be handled by generateLongTermChangesForWeek when needed
    },

    // Remove a pending change
    removePendingChange (key: string) {
      this.pendingChanges.delete(key)
      this.persistToSession()
    },

    // Clear all pending changes
    clearAllChanges () {
      this.pendingChanges.clear()
      this.persistToSession()
    },

    // Check if there's a pending change for a key
    hasPendingChange (key: string): boolean {
      return this.pendingChanges.has(key)
    },

    // Remove changes for a specific week (when reverting)
    clearChangesForWeek (weekStart: Date) {
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      const keysToRemove: string[] = []

      for (const [key, change] of this.pendingChanges.entries()) {
        if (change.executionDate
          && change.executionDate >= weekStartStr
          && change.executionDate <= weekEndStr) {
          keysToRemove.push(key)
        }
      }

      for (const key of keysToRemove) {
        this.pendingChanges.delete(key)
      }
      if (keysToRemove.length > 0) {
        this.persistToSession()
      }
    },

    // Get pending changes for a specific route
    getPendingChangesForRoute (routeId: string): PendingChange[] {
      const changes: PendingChange[] = []
      for (const [key, change] of this.pendingChanges.entries()) {
        if (change.routeId === routeId) {
          changes.push(change)
        }
      }
      return changes
    },

    // Get pending changes for a specific week
    getPendingChangesForWeek (weekStart: Date): PendingChange[] {
      const changes: PendingChange[] = []
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      for (const [key, change] of this.pendingChanges.entries()) {
        if (change.executionDate
          && change.executionDate >= weekStartStr
          && change.executionDate <= weekEndStr) {
          changes.push(change)
        }
      }
      return changes
    },

    // Get all active long-term substitutions (no end date)
    getActiveLongTermSubstitutions (): PendingChange[] {
      const longTermChanges: PendingChange[] = []

      for (const [key, change] of this.pendingChanges.entries()) {
        if ((change.isLongTermDriver || change.isLongTermTruck)
          && change.longTermStartDate) {
          longTermChanges.push(change)
        }
      }

      return longTermChanges
    },

    // Find the applicable long-term substitution for a specific route and date
    findApplicableLongTermSubstitution (longTermSubs: PendingChange[], routeId: string, targetDate: string): PendingChange | null {
      // Filter substitutions for this route that apply to the target date
      const applicableSubs = longTermSubs.filter(sub =>
        sub.routeId === routeId
        && sub.longTermStartDate
        && targetDate >= sub.longTermStartDate
        && (!sub.longTermEndDate || targetDate <= sub.longTermEndDate),
      )

      // Return the most recent one (latest start date)
      if (applicableSubs.length > 0) {
        return applicableSubs.reduce((latest, current) =>
          current.longTermStartDate! > latest.longTermStartDate! ? current : latest,
        )
      }

      return null
    },

    // Handle splitting an existing long-term substitution when a new manual assignment is made
    handleLongTermSubstitutionSplit (newChange: PendingChange) {
      if (!newChange.executionDate || !newChange.routeId) {
        return
      }

      const targetDate = newChange.executionDate
      const routeId = newChange.routeId

      // Find any existing long-term substitutions for this route that would be affected
      for (const [existingKey, existingChange] of this.pendingChanges.entries()) {
        if (existingChange.routeId === routeId
          && (existingChange.isLongTermDriver || existingChange.isLongTermTruck)
          && existingChange.longTermStartDate
          && existingChange.longTermStartDate < targetDate
          && !existingChange.longTermEndDate) {
          // Calculate the day before the new assignment
          const newEndDate = new Date(targetDate)
          newEndDate.setDate(newEndDate.getDate() - 1)
          const newEndDateStr = newEndDate.toISOString().split('T')[0]

          // Update the existing long-term substitution to end the day before
          const updatedExistingChange = {
            ...existingChange,
            longTermEndDate: newEndDateStr,
          }

          this.pendingChanges.set(existingKey, updatedExistingChange)

          // Remove any pending changes for this route that are now past the end date
          const keysToUpdate: string[] = []
          for (const [checkKey, checkChange] of this.pendingChanges.entries()) {
            if (checkChange.routeId === routeId
              && checkChange.executionDate
              && checkChange.executionDate > newEndDateStr
              && checkChange.longTermStartDate === existingChange.longTermStartDate) {
              keysToUpdate.push(checkKey)
            }
          }

          // Remove future pending changes that are no longer valid
          for (const keyToRemove of keysToUpdate) {
            this.pendingChanges.delete(keyToRemove)
          }
        }
      }
    },

    // Generate pending changes for long-term substitutions in a new week
    generateLongTermChangesForWeek (weekStart: Date, routes: Map<string, any>, plannedRoutesMap: Map<string, any>) {
      // Set flag to prevent recursive propagation during generation
      this.isGeneratingChanges = true

      // Get all long-term substitutions
      const longTermSubs = this.getActiveLongTermSubstitutions()

      // For each day of this week
      for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
        const currentDate = new Date(weekStart)
        currentDate.setDate(weekStart.getDate() + dayOfWeek)
        const currentDateStr = currentDate.toISOString().split('T')[0]

        // Check each route
        for (const routeId of routes.keys()) {
          const routeKey = `${routeId}-${dayOfWeek}`

          // Only apply to days that are actually scheduled (either in DB or pending schedule)
          const hasPlannedRoute = plannedRoutesMap.has(routeKey)
          const hasPendingSchedule = this.pendingChanges.has(routeKey)
            && this.pendingChanges.get(routeKey)?.type === 'schedule'
          const hasPendingCancel = this.pendingChanges.has(routeKey)
            && this.pendingChanges.get(routeKey)?.type === 'cancel'

          const isScheduled = (hasPlannedRoute || hasPendingSchedule) && !hasPendingCancel

          if (isScheduled) {
            // Don't overwrite existing assignment changes
            const existingChange = this.pendingChanges.get(routeKey)
            const hasAssignmentChange = existingChange
              && (existingChange.type === 'driver-assignment'
                || existingChange.type === 'truck-assignment'
                || existingChange.type === 'combined-assignment')

            if (!hasAssignmentChange) {
              // Find applicable long-term substitution for this route and date
              const applicableSub = this.findApplicableLongTermSubstitution(longTermSubs, routeId, currentDateStr)

              if (applicableSub) {
                // Create assignment change based on the long-term substitution
                const assignmentChange: PendingChange = {
                  type: 'driver-assignment', // Will be updated below
                  routeId,
                  dayOfWeek,
                  executionDate: currentDateStr,
                  isLongTermDriver: applicableSub.isLongTermDriver,
                  isLongTermTruck: applicableSub.isLongTermTruck,
                  longTermStartDate: applicableSub.longTermStartDate,
                  longTermEndDate: applicableSub.longTermEndDate,
                }

                // Copy driver assignment if present
                if (applicableSub.assignedDriverId) {
                  assignmentChange.assignedDriverId = applicableSub.assignedDriverId
                  assignmentChange.driverName = applicableSub.driverName
                  assignmentChange.driverId = applicableSub.driverId
                }

                // Copy truck assignment if present
                if (applicableSub.assignedTruckId || applicableSub.assignedTruckNumber) {
                  assignmentChange.assignedTruckId = applicableSub.assignedTruckId
                  assignmentChange.assignedTruckNumber = applicableSub.assignedTruckNumber
                  assignmentChange.truckType = applicableSub.truckType
                }

                // Set correct type
                if (assignmentChange.assignedDriverId && (assignmentChange.assignedTruckId || assignmentChange.assignedTruckNumber)) {
                  assignmentChange.type = 'combined-assignment'
                } else if (assignmentChange.assignedDriverId) {
                  assignmentChange.type = 'driver-assignment'
                } else if (assignmentChange.assignedTruckId || assignmentChange.assignedTruckNumber) {
                  assignmentChange.type = 'truck-assignment'
                }

                // Set the change directly
                this.pendingChanges.set(routeKey, assignmentChange)
              }
            }
          }
        }
      }

      // Reset flag and persist
      this.isGeneratingChanges = false
      this.persistToSession()
    },

    // Clear changes that are older than the current week, but preserve long-term substitutions
    cleanupOldChanges (currentWeekStart: Date) {
      const weekStartStr = currentWeekStart.toISOString().split('T')[0]
      const keysToRemove: string[] = []

      for (const [key, change] of this.pendingChanges.entries()) {
        if (change.executionDate && change.executionDate < weekStartStr // Don't remove long-term substitutions - they should persist
          && !change.isLongTermDriver && !change.isLongTermTruck) {
          keysToRemove.push(key)
        }
      }

      for (const key of keysToRemove) {
        this.pendingChanges.delete(key)
      }
      if (keysToRemove.length > 0) {
        this.persistToSession()
      }
    },
  },
})

// Helper function to get start of week (Sunday = 0)
function getStartOfWeek (date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}
