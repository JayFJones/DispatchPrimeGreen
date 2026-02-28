<template>
  <div>
    <!-- Loading state -->
    <v-overlay
      v-model="loading"
      class="align-center justify-center"
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      />
    </v-overlay>

    <!-- Route not found -->
    <v-alert
      v-if="!loading && !route"
      color="error"
      icon="mdi-alert-circle"
      title="Route Not Found"
      type="error"
    >
      The requested route could not be found.
      <template #append>
        <v-btn
          color="white"
          variant="outlined"
          @click="router.push('/routes')"
        >
          Back to Routes
        </v-btn>
      </template>
    </v-alert>

    <!-- Route details -->
    <div v-if="!loading && route">
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="router.push('/routes')"
            />
            <div class="ml-3">
              <h1 class="text-h4 mb-1">Route {{ route.trkid }}</h1>
              <p class="text-body-1 text-grey-darken-1">
                Detailed route information and stops
              </p>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Route Overview Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="primary"
                icon="mdi-map-marker-path"
                size="32"
              />
              <h3 class="text-h6">Route ID</h3>
              <p class="text-h5 font-weight-bold text-primary">{{ route.trkid }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card
            class="cursor-pointer"
            :disabled="!terminal"
            hover
            @click="navigateToTerminal"
          >
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="blue"
                icon="mdi-office-building"
                size="32"
              />
              <h3 class="text-h6">Terminal</h3>
              <p class="text-h6 font-weight-bold">{{ terminal?.name || 'Unknown' }}</p>
              <p class="text-caption text-grey">{{ terminal?.city }}, {{ terminal?.state }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="secondary"
                icon="mdi-tag"
                size="32"
              />
              <h3 class="text-h6">DCP</h3>
              <p class="text-h5 font-weight-bold text-secondary">{{ terminal?.dcp || 'N/A' }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="green"
                icon="mdi-map-marker-multiple"
                size="32"
              />
              <h3 class="text-h6">Total Stops</h3>
              <p class="text-h5 font-weight-bold text-green">{{ route.totalStops || 0 }}</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>


      <!-- Equipment & Operations Row -->
      <v-row class="mb-6">
        <!-- First Card: Assigned Driver -->
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-account" />
              Assigned Driver
            </v-card-title>
            <v-card-text>
              <div v-if="assignedDriver" class="text-center py-4">
                <v-icon class="mb-2" color="green" icon="mdi-account-circle" size="48" />
                <p class="text-h6 font-weight-bold">{{ assignedDriver.firstName }} {{ assignedDriver.lastName }}</p>
                <p v-if="assignedDriver.employeeNo" class="text-body-2 text-grey">Employee #{{ assignedDriver.employeeNo }}</p>
                <v-chip color="green" size="small" variant="outlined">
                  Default Driver
                </v-chip>
              </div>
              <div v-else class="text-center py-4">
                <v-icon class="mb-2" color="grey" icon="mdi-account-outline" size="48" />
                <p class="text-grey">No driver assigned</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Second Card: Assigned Truck -->
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" :icon="getTruckIcon(route.truckNumber)" />
              Assigned Truck
            </v-card-title>
            <v-card-text>
              <div v-if="route.truckNumber || route.subUnitNumber" class="py-4">
                <!-- Horizontal layout for both truck and sub-unit -->
                <div v-if="route.truckNumber && route.subUnitNumber" class="d-flex align-center justify-space-around">
                  <!-- Primary Truck -->
                  <div class="text-center">
                    <v-icon class="mb-2" color="blue" :icon="getTruckIcon(route.truckNumber)" size="40" />
                    <div class="d-flex align-center justify-center gap-1 mb-1">
                      <span class="text-body-1 font-weight-bold">{{ route.truckNumber }}</span>
                      <v-chip
                        v-if="getTruckType(route.truckNumber)"
                        :color="getTruckTypeColor(getTruckType(route.truckNumber))"
                        size="x-small"
                        variant="outlined"
                      >
                        {{ getTruckType(route.truckNumber) }}
                      </v-chip>
                    </div>
                    <v-chip color="blue" size="x-small" variant="outlined">
                      Primary
                    </v-chip>
                  </div>

                  <!-- Arrow -->
                  <div class="text-center">
                    <v-icon color="grey" icon="mdi-arrow-right" size="32" />
                  </div>

                  <!-- Sub-unit -->
                  <div class="text-center">
                    <v-icon class="mb-2" color="orange" :icon="getTruckIcon(route.subUnitNumber)" size="40" />
                    <div class="d-flex align-center justify-center gap-1 mb-1">
                      <span class="text-body-1 font-weight-bold">{{ route.subUnitNumber }}</span>
                      <v-chip
                        v-if="getTruckType(route.subUnitNumber)"
                        :color="getTruckTypeColor(getTruckType(route.subUnitNumber))"
                        size="x-small"
                        variant="outlined"
                      >
                        {{ getTruckType(route.subUnitNumber) }}
                      </v-chip>
                    </div>
                    <v-chip color="orange" size="x-small" variant="outlined">
                      Sub-unit
                    </v-chip>
                  </div>
                </div>

                <!-- Primary truck only -->
                <div v-else-if="route.truckNumber && !route.subUnitNumber" class="text-center">
                  <v-icon class="mb-2" color="blue" :icon="getTruckIcon(route.truckNumber)" size="48" />
                  <div class="d-flex align-center justify-center gap-2 mb-2">
                    <span class="text-h6 font-weight-bold">{{ route.truckNumber }}</span>
                    <v-chip
                      v-if="getTruckType(route.truckNumber)"
                      :color="getTruckTypeColor(getTruckType(route.truckNumber))"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ getTruckType(route.truckNumber) }}
                    </v-chip>
                  </div>
                  <v-chip color="blue" size="small" variant="outlined">
                    Primary Truck
                  </v-chip>
                </div>

                <!-- Sub-unit only -->
                <div v-else-if="!route.truckNumber && route.subUnitNumber" class="text-center">
                  <v-icon class="mb-2" color="orange" :icon="getTruckIcon(route.subUnitNumber)" size="48" />
                  <div class="d-flex align-center justify-center gap-2 mb-2">
                    <span class="text-h6 font-weight-bold">{{ route.subUnitNumber }}</span>
                    <v-chip
                      v-if="getTruckType(route.subUnitNumber)"
                      :color="getTruckTypeColor(getTruckType(route.subUnitNumber))"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ getTruckType(route.subUnitNumber) }}
                    </v-chip>
                  </div>
                  <v-chip color="orange" size="small" variant="outlined">
                    Sub-unit Only
                  </v-chip>
                </div>
              </div>
              <div v-else class="text-center py-4">
                <v-icon class="mb-2" color="grey" icon="mdi-truck-outline" size="48" />
                <p class="text-grey">No truck assigned</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Third Card: Scanner & Fuel Card Combined -->
        <v-col cols="12" md="4">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-tools" />
              Equipment
            </v-card-title>
            <v-card-text>
              <!-- Scanner Section -->
              <div class="mb-4">
                <div class="d-flex align-center mb-2">
                  <v-icon class="mr-2" color="purple" icon="mdi-barcode-scan" size="20" />
                  <span class="text-body-1 font-weight-medium">Scanner</span>
                </div>
                <div v-if="route.scanner" class="text-center">
                  <p class="text-h6 font-weight-bold">{{ route.scanner }}</p>
                  <v-chip color="purple" size="x-small" variant="outlined">
                    Assigned
                  </v-chip>
                </div>
                <div v-else class="text-center">
                  <p class="text-grey text-body-2">Not assigned</p>
                </div>
              </div>

              <v-divider class="my-3" />

              <!-- Fuel Card Section -->
              <div>
                <div class="d-flex align-center mb-2">
                  <v-icon class="mr-2" color="orange" icon="mdi-credit-card" size="20" />
                  <span class="text-body-1 font-weight-medium">Fuel Card</span>
                </div>
                <div v-if="route.fuelCard" class="text-center">
                  <p class="text-h6 font-weight-bold">{{ route.fuelCard }}</p>
                </div>
                <div v-else class="text-center">
                  <p class="text-grey text-body-2">Not assigned</p>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Dispatched Route Executions -->
      <DispatchedRoutesTable
        :dispatched-routes="dispatchedRoutes"
        :drivers="driversMap"
        :equipment="equipmentData"
        :loading="dispatchedRoutesLoading"
        :route-id="routeData?._id"
        @delete-dispatched-route="deleteDispatchedRoute"
        @edit-dispatched-route="editDispatchedRoute"
        @open-route-planning="openRoutePlanning"
      />

      <!-- Route Timeline -->
      <v-card class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" icon="mdi-timeline-clock" />
            Route Timeline
          </div>
          <div class="d-flex align-center text-body-2 text-grey-darken-1">
            <div class="d-flex align-center mr-4">
              <v-icon class="mr-1" size="small">mdi-map-marker-distance</v-icon>
              <span>{{ formatDistance(route.estimatedDistance || 0) }} mi</span>
            </div>
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-clock</v-icon>
              <span>{{ formatDuration(route.estimatedDuration || 0) }}</span>
            </div>
          </div>
        </v-card-title>
        <v-card-text>
          <div v-if="routeStops.length > 0">
            <!-- Horizontal Timeline with Scrollbar -->
            <div class="timeline-scroll-container">
              <v-timeline
                class="route-timeline"
                direction="horizontal"
                line-inset="8"
                truncate-line="both"
              >
                <v-timeline-item
                  v-for="(stop, index) in routeStops"
                  :key="stop._id"
                  :dot-color="getStopColor(index)"
                  size="small"
                >
                  <!-- Dot content with sequence number -->
                  <template #icon>
                    <span class="text-caption font-weight-bold white--text">
                      {{ stop.sequence }}
                    </span>
                  </template>

                  <!-- Timeline content -->
                  <RouteStopCard
                    :notes="getStopNotes(stop._id)"
                    :stop="stop"
                    show-debug
                    @add-note="addNote"
                    @show-notes="showNotes"
                  />
                </v-timeline-item>
              </v-timeline>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <v-icon class="mb-2" color="grey" icon="mdi-timeline-clock-outline" size="48" />
            <p class="text-grey">No route stops available for timeline</p>
          </div>
        </v-card-text>
      </v-card>

      <!-- Route Stops Table -->
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" icon="mdi-map-marker-multiple" />
          Route Stops ({{ routeStops.length }})
        </v-card-title>

        <v-data-table
          :headers="stopHeaders"
          item-value="_id"
          :items="routeStops"
          :loading="stopsLoading"
        >
          <!-- Sequence column -->
          <template #item.sequence="{ item }">
            <v-chip
              :color="item.isTerminal ? (item.isStart ? 'green' : 'red') : 'primary'"
              size="small"
            >
              {{ item.isTerminal ? (item.isStart ? 'START' : 'END') : item.sequence }}
            </v-chip>
          </template>

          <!-- Customer column -->
          <template #item.customer="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.custName || 'Unknown' }}</div>
              <div class="text-caption text-grey-darken-1">{{ item.cid }}</div>
            </div>
          </template>

          <!-- Address column -->
          <template #item.address="{ item }">
            <div>
              <div>{{ item.address }}</div>
              <div class="text-caption text-grey-darken-1">
                {{ item.city }}, {{ item.state }} {{ item.zipCode }}
              </div>
            </div>
          </template>

          <!-- ETA column -->
          <template #item.eta="{ item }">
            <span class="text-body-2">
              {{ item.isEnd ? '--' : convertFloatToTime(item.eta) }}
            </span>
          </template>

          <!-- ETD column -->
          <template #item.etd="{ item }">
            <span class="text-body-2">
              {{ item.isStart ? '--' : convertFloatToTime(item.etd) }}
            </span>
          </template>

          <!-- Commit Time column -->
          <template #item.commitTime="{ item }">
            <span class="text-body-2">{{ convertFloatToTime(item.commitTime) }}</span>
          </template>

          <!-- Customer hours column -->
          <template #item.hours="{ item }">
            <div class="text-caption">
              <div v-if="item.openTime"><strong>Open:</strong> {{ convertFloatToTime(item.openTime) }}</div>
              <div v-if="item.closeTime"><strong>Close:</strong> {{ convertFloatToTime(item.closeTime) }}</div>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- Notes Dialog -->
    <RouteStopNotesDialog
      v-model="notesDialogVisible"
      :notes="selectedStopNotes"
      :stop-id="selectedStopId"
      :stop-name="selectedStopName"
      @delete-note="deleteNote"
      @save-note="saveNote"
      @update-note="updateNote"
    />
  </div>
</template>

<script setup lang="ts">
  import DispatchedRoutesTable from '@/components/DispatchedRoutesTable.vue'
  import RouteStopCard from '@/components/RouteStopCard.vue'
  import RouteStopNotesDialog from '@/components/RouteStopNotesDialog.vue'
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { terminalToUrlId } from '@/utils/terminal-url-helpers'

  const authStore = useAuthStore()
  const router = useRouter()
  const currentRoute = useRoute()

  // Reactive data
  const loading = ref(true)
  const stopsLoading = ref(false)
  const dispatchedRoutesLoading = ref(false)
  const routeData = ref<any>(null)
  const terminal = ref<any>(null)
  const routeStops = ref<any[]>([])
  const dispatchedRoutes = ref<any[]>([])
  const driversMap = ref<Map<string, any>>(new Map())
  const equipmentData = ref<Map<string, any>>(new Map())

  // Notes data
  const stopNotes = ref<Map<string, any[]>>(new Map())
  const notesDialogVisible = ref(false)
  const selectedStopId = ref<string>('')
  const selectedStopName = ref<string>('')
  const selectedStopNotes = ref<any[]>([])

  // Get route name from URL (URL-safe format)
  const routeNameParam = currentRoute.params.id as string
  
  // Convert URL-safe format back to route name (replace dashes with dots)
  const routeName = routeNameParam.replace(/-/g, '.')

  // Computed
  const route = computed(() => routeData.value)
  
  const assignedDriver = computed(() => {
    if (route.value?.defaultDriverId && driversMap.value.has(route.value.defaultDriverId)) {
      return driversMap.value.get(route.value.defaultDriverId)
    }
    return null
  })

  // Table headers for stops
  const stopHeaders = [
    { title: 'Seq', key: 'sequence', sortable: true, width: '80px' },
    { title: 'Customer', key: 'customer', sortable: false },
    { title: 'Address', key: 'address', sortable: false },
    { title: 'ETA', key: 'eta', sortable: false },
    { title: 'ETD', key: 'etd', sortable: false },
    { title: 'Commit', key: 'commitTime', sortable: false },
    { title: 'Hours', key: 'hours', sortable: false },
    { title: 'Time Zone', key: 'timeZone', sortable: false },
  ]

  // Methods
  const loadRouteDetails = async () => {
    try {
      loading.value = true

      // Load route details by trkid (backend hook will populate stops, estimatedDuration, estimatedDistance)
      const routeQuery = await feathersClient.service('routes').find({
        query: {
          trkid: routeName,
          $limit: 1
        }
      })
      
      // Check if route was found
      const routes = Array.isArray(routeQuery) ? routeQuery : routeQuery.data || []
      if (routes.length === 0) {
        console.error(`Route not found with trkid: ${routeName}`)
        routeData.value = null
        return
      }
      
      const routeResponse = routes[0]
      routeData.value = routeResponse

      // Use backend-populated stops if available, otherwise load manually for compatibility
      if (routeResponse.stops && Array.isArray(routeResponse.stops)) {
        routeStops.value = routeResponse.stops.sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
      } else {
        // Fallback to manual loading if backend hook didn't populate stops
        await loadRouteStops()
      }

      // Load terminal if associated
      if (routeResponse.terminalId) {
        const terminalResponse = await feathersClient.service('terminals').get(routeResponse.terminalId)
        terminal.value = terminalResponse
      }

      // Load assigned driver if one exists
      if (routeResponse.defaultDriverId) {
        try {
          const driverResponse = await feathersClient.service('drivers').get(routeResponse.defaultDriverId)
          driversMap.value.set(routeResponse.defaultDriverId, driverResponse)
        } catch (error) {
          console.error('Error loading assigned driver:', error)
        }
      }

      // Load equipment data for truck types and icons
      await loadEquipmentData()

      // Load planned routes
      await loadDispatchedRoutes()
    } catch (error) {
      console.error('Error loading route details:', error)
      routeData.value = null
    } finally {
      loading.value = false
    }
  }

  const loadRouteStops = async () => {
    try {
      stopsLoading.value = true

      // Fallback method for loading stops if backend hook didn't populate them
      const getAllRecords = async (service: any, query: any) => {
        const countResult = await service.find({ query: { ...query, $limit: 0 } })
        const total = countResult.total

        if (total === 0) return []

        const allRecords: any[] = []
        const limit = 1000
        let skip = 0

        while (skip < total) {
          const result = await service.find({
            query: { ...query, $limit: limit, $skip: skip },
          })
          allRecords.push(...result.data)

          if (result.data.length < limit) break
          skip += limit
        }

        return allRecords
      }

      const stops = await getAllRecords(
        feathersClient.service('route-stops'),
        { routeId: routeData.value?._id },
      )

      // Sort by sequence
      routeStops.value = stops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    } catch (error) {
      console.error('Error loading route stops:', error)
      routeStops.value = []
    } finally {
      stopsLoading.value = false
    }
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A'

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    } catch {
      return 'Invalid Date'
    }
  }

  const convertFloatToTime = (timeValue: any): string => {
    if (!timeValue && timeValue !== 0) return ''

    try {
      // Handle string values that might contain time formats already
      if (typeof timeValue === 'string') {
        // If it already looks like a time (contains :), return as is
        if (timeValue.includes(':')) {
          return timeValue
        }
        // Try to parse as float
        const floatValue = Number.parseFloat(timeValue)
        if (isNaN(floatValue)) return timeValue
        timeValue = floatValue
      }

      // Convert float to time (assuming decimal hours format like 14.5 = 2:30 PM)
      if (typeof timeValue === 'number') {
        const hours = Math.floor(timeValue)
        const minutes = Math.round((timeValue - hours) * 60)

        // Ensure valid time range
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return timeValue.toString()
        }

        // Format as 24-hour time
        const formattedHours = hours.toString().padStart(2, '0')
        const formattedMinutes = minutes.toString().padStart(2, '0')
        return `${formattedHours}:${formattedMinutes}`
      }

      return timeValue.toString()
    } catch {
      return timeValue?.toString() || ''
    }
  }


  // Get color for timeline stop
  const getStopColor = (index: number): string => {
    const stop = routeStops.value[index]
    if (stop?.isTerminal) {
      return stop.isStart ? 'green' : 'red'
    }
    return 'primary'
  }

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (distance === 0) return 'N/A'
    return distance.toFixed(1)
  }

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'N/A'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }



  // Load equipment data for truck types and icons
  const loadEquipmentData = async () => {
    try {
      const route = routeData.value
      if (!route) return

      // Collect equipment numbers to lookup
      const equipmentNumbers: string[] = []
      if (route.truckNumber) equipmentNumbers.push(route.truckNumber)
      if (route.subUnitNumber) equipmentNumbers.push(route.subUnitNumber)

      if (equipmentNumbers.length === 0) return

      // Load equipment information
      const equipmentResponse = await feathersClient.service('equipment').find({
        query: {
          equipmentNumber: { $in: equipmentNumbers },
          $limit: equipmentNumbers.length,
        },
      })

      // Create equipment lookup map
      const equipmentMap = new Map()
      equipmentResponse.data.forEach((equipment: any) => {
        equipmentMap.set(equipment.equipmentNumber, equipment)
      })

      equipmentData.value = equipmentMap
    } catch (error) {
      console.error('Error loading equipment data:', error)
      equipmentData.value = new Map()
    }
  }

  // Get truck icon based on truck type
  const getTruckIcon = (equipmentNumber: string): string => {
    if (!equipmentNumber) return 'mdi-truck'

    const equipment = equipmentData.value.get(equipmentNumber)
    if (!equipment || !equipment.truckType) return 'mdi-truck'

    // Use big-rig icon for tractor trailers (TT), regular truck icon for straight trucks (ST)
    return equipment.truckType === 'TT' ? 'mdi-truck-trailer' : 'mdi-truck'
  }

  // Get truck type for display
  const getTruckType = (equipmentNumber: string): string => {
    if (!equipmentNumber) return ''

    const equipment = equipmentData.value.get(equipmentNumber)
    return equipment?.truckType || ''
  }

  // Get truck type color for chips
  const getTruckTypeColor = (truckType: string): string => {
    switch (truckType) {
      case 'TT': {
        return 'deep-purple'
      }
      case 'ST': {
        return 'teal'
      }
      default: {
        return 'grey'
      }
    }
  }

  // Navigate to terminal details
  const navigateToTerminal = () => {
    if (terminal.value && terminal.value.name) {
      const urlId = terminalToUrlId(terminal.value)
      router.push(`/terminals/${urlId}`)
    }
  }

  // Notes Methods
  const getStopNotes = (stopId: string): any[] => {
    return stopNotes.value.get(stopId) || []
  }

  const showNotes = (stopId: string) => {
    const stop = routeStops.value.find(s => s._id === stopId)
    if (!stop) return

    selectedStopId.value = stopId
    selectedStopName.value = stop.custName || 'Unknown Customer'
    selectedStopNotes.value = getStopNotes(stopId)
    notesDialogVisible.value = true
  }

  const addNote = (stopId: string) => {
    const stop = routeStops.value.find(s => s._id === stopId)
    if (!stop) return

    selectedStopId.value = stopId
    selectedStopName.value = stop.custName || 'Unknown Customer'
    selectedStopNotes.value = getStopNotes(stopId)
    notesDialogVisible.value = true
  }

  const saveNote = (stopId: string, note: any) => {
    const current = stopNotes.value.get(stopId) || []
    stopNotes.value.set(stopId, [...current, note])

    // Update selected notes if this is the currently selected stop
    if (selectedStopId.value === stopId) {
      selectedStopNotes.value = stopNotes.value.get(stopId) || []
    }

    // TODO: Save to backend
    console.log('Added note to stop:', stopId, note)
  }

  const updateNote = (stopId: string, noteId: string, updatedNote: any) => {
    const current = stopNotes.value.get(stopId) || []
    const index = current.findIndex(n => n.id === noteId)
    if (index !== -1) {
      current[index] = { ...current[index], ...updatedNote }
      stopNotes.value.set(stopId, [...current])
      selectedStopNotes.value = stopNotes.value.get(stopId) || []
    }

    // TODO: Save to backend
    console.log('Updated note for stop:', stopId, noteId, updatedNote)
  }

  const deleteNote = (stopId: string, noteId: string) => {
    const current = stopNotes.value.get(stopId) || []
    const filtered = current.filter(n => n.id !== noteId)
    stopNotes.value.set(stopId, filtered)
    selectedStopNotes.value = stopNotes.value.get(stopId) || []

    // TODO: Remove from backend
    console.log('Deleted note from stop:', stopId, noteId)
  }

  // Load dispatched routes for the next 30 days
  const loadDispatchedRoutes = async () => {
    try {
      dispatchedRoutesLoading.value = true

      // Calculate date range (next 30 days)
      const today = new Date()
      const thirtyDaysLater = new Date()
      thirtyDaysLater.setDate(today.getDate() + 30)

      // Query dispatched routes for this route
      const response = await feathersClient.service('dispatched-routes').find({
        query: {
          routeId: routeData.value?._id,
          executionDate: {
            $gte: today.toISOString().split('T')[0], // Today
            $lte: thirtyDaysLater.toISOString().split('T')[0], // 30 days from now
          },
          $sort: { executionDate: 1 },
        },
      })

      dispatchedRoutes.value = response.data || []

      // Load related driver and equipment data
      await loadRelatedData()
    } catch (error) {
      console.error('Error loading planned routes:', error)
      dispatchedRoutes.value = []
    } finally {
      dispatchedRoutesLoading.value = false
    }
  }

  // Load drivers and equipment referenced in planned routes
  const loadRelatedData = async () => {
    try {
      const driverIds = new Set<string>()
      const equipmentIds = new Set<string>()

      // Collect unique IDs from planned routes
      for (const route of dispatchedRoutes.value) {
        if (route.assignedDriverId) driverIds.add(route.assignedDriverId)
        if (route.assignedTruckId) equipmentIds.add(route.assignedTruckId)
        if (route.assignedSubUnitId) equipmentIds.add(route.assignedSubUnitId)
      }

      // Load drivers
      if (driverIds.size > 0) {
        const driversResponse = await feathersClient.service('drivers').find({
          query: {
            _id: { $in: Array.from(driverIds) },
            $limit: driverIds.size,
          },
        })

        const newDriversMap = new Map()
        driversResponse.data.forEach((driver: any) => {
          newDriversMap.set(driver._id, driver)
        })
        driversMap.value = newDriversMap
      }

      // Load equipment (add to existing equipment data)
      if (equipmentIds.size > 0) {
        const equipmentResponse = await feathersClient.service('equipment').find({
          query: {
            _id: { $in: Array.from(equipmentIds) },
            $limit: equipmentIds.size,
          },
        })

        equipmentResponse.data.forEach((equipment: any) => {
          equipmentData.value.set(equipment._id, equipment)
        })
      }
    } catch (error) {
      console.error('Error loading related data for planned routes:', error)
    }
  }

  // Handle route planning events
  const openRoutePlanning = () => {
    router.push(`/routes/${routeNameParam}/planning`)
  }

  const editDispatchedRoute = (dispatchedRoute: any) => {
    // TODO: Open edit dialog or navigate to edit page
    console.log('Edit dispatched route:', dispatchedRoute)
  }

  const deleteDispatchedRoute = async (dispatchedRoute: any) => {
    try {
      await feathersClient.service('dispatched-routes').remove(dispatchedRoute._id)
      // Reload dispatched routes
      await loadDispatchedRoutes()
    } catch (error) {
      console.error('Error deleting dispatched route:', error)
    }
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadRouteDetails()
  })
</script>

<style scoped>
/* Cursor pointer for clickable elements */
.cursor-pointer {
  cursor: pointer;
}

/* Timeline Scroll Container */
.timeline-scroll-container {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 10px 0;
  margin: 0 -16px; /* Extend to card edges */
  padding-left: 16px;
  padding-right: 16px;
}

/* Custom scrollbar styling */
.timeline-scroll-container::-webkit-scrollbar {
  height: 8px;
}

.timeline-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.timeline-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.timeline-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Route Timeline Styling */
.route-timeline {
  padding: 20px 0;
  min-width: max-content; /* Ensure timeline doesn't compress */
}


/* Timeline header responsive adjustments */
@media (max-width: 768px) {
  .v-card-title.justify-space-between {
    flex-direction: column !important;
    align-items: flex-start !important;
  }

  .v-card-title .d-flex.text-body-2 {
    margin-top: 8px;
    align-self: stretch;
    justify-content: space-around;
  }

  .v-card-title .d-flex.text-body-2 .mr-4 {
    margin-right: 0 !important;
  }
}

/* Responsive adjustments for timeline scroll container */
@media (max-width: 960px) {
  .timeline-scroll-container {
    margin: 0 -12px;
    padding-left: 12px;
    padding-right: 12px;
  }
}

@media (max-width: 600px) {

  .route-timeline {
    padding: 10px 0;
  }

  .timeline-scroll-container {
    margin: 0 -8px;
    padding-left: 8px;
    padding-right: 8px;
  }

  /* Smaller scrollbar on mobile */
  .timeline-scroll-container::-webkit-scrollbar {
    height: 6px;
  }
}

/* Timeline dot customization */
.v-timeline-item .v-timeline-item__dot {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* White text in timeline dots */
.white--text {
  color: white !important;
}

</style>
