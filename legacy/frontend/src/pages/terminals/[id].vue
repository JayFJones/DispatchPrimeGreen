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

    <!-- Terminal not found -->
    <v-alert
      v-if="!loading && !terminal"
      color="error"
      icon="mdi-alert-circle"
      title="Terminal Not Found"
      type="error"
    >
      The requested terminal could not be found.
      <template #append>
        <v-btn
          color="white"
          variant="outlined"
          @click="router.push('/terminals')"
        >
          Back to Terminals
        </v-btn>
      </template>
    </v-alert>

    <!-- Terminal details -->
    <div v-if="!loading && terminal">
      <!-- Page Controls -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            @click="router.push('/terminals')"
          />
        </v-col>
      </v-row>

      <!-- Terminal Overview Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card class="h-100 d-flex flex-column">
            <v-card-text class="text-center flex-grow-1 d-flex flex-column justify-center">
              <div>
                <v-icon
                  class="mb-2"
                  color="primary"
                  icon="mdi-office-building"
                  size="32"
                />
                <h3 class="text-h6">Terminal</h3>
                <p class="text-h5 font-weight-bold text-primary">{{ terminal.name }}</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card class="h-100 d-flex flex-column">
            <v-card-text class="text-center flex-grow-1 d-flex flex-column justify-center">
              <div>
                <v-icon
                  class="mb-2"
                  color="blue"
                  icon="mdi-account-supervisor"
                  size="32"
                />
                <h3 class="text-h6">Leadership</h3>
                <div v-if="terminal.leaders && terminal.leaders.length > 0" class="mt-2">
                  <div
                    v-for="leader in terminal.leaders.slice(0, 2)"
                    :key="leader.name"
                    class="mb-1"
                  >
                    <p class="text-body-2 font-weight-bold text-blue mb-0">{{ leader.name }}</p>
                    <p class="text-caption text-grey">{{ leader.title }}</p>
                  </div>
                  <p v-if="terminal.leaders.length > 2" class="text-caption text-grey mt-1">
                    +{{ terminal.leaders.length - 2 }} more
                  </p>
                </div>
                <div v-else class="mt-2">
                  <p class="text-body-2 text-grey">No leaders assigned</p>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card
            class="h-100 d-flex flex-column cursor-pointer"
            hover
            @click="goToRoutePlanning"
          >
            <v-card-text class="text-center flex-grow-1 d-flex flex-column justify-center">
              <div>
                <v-icon
                  class="mb-2"
                  color="purple"
                  icon="mdi-calendar-clock"
                  size="32"
                />
                <h3 class="text-h6">Route Planning</h3>
                <p class="text-h5 font-weight-bold text-purple">Plan Routes</p>
                <div class="mt-2">
                  <p class="text-caption text-grey">Schedule & organize routes</p>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card
            class="h-100 d-flex flex-column cursor-pointer"
            hover
            @click="goToDispatch"
          >
            <v-card-text class="text-center flex-grow-1 d-flex flex-column justify-center">
              <div>
                <v-icon
                  class="mb-2"
                  color="orange"
                  icon="mdi-truck-delivery"
                  size="32"
                />
                <h3 class="text-h6">Dispatch</h3>
                <p class="text-h5 font-weight-bold text-orange">Manage Today</p>
                <div class="mt-2">
                  <p class="text-caption text-grey">Live route management</p>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

      </v-row>

      <!-- Terminal Routes -->
      <v-card class="mb-6">
        <v-card-title>
          <v-icon class="mr-2" icon="mdi-map-marker-path" />
          Terminal Routes ({{ terminalRoutes.length }})
        </v-card-title>

        <v-data-table
          :headers="routeHeaders"
          item-value="_id"
          :items="terminalRoutes"
          :loading="routesLoading"
          @click:row="goToRoute"
        >
          <!-- Route ID column -->
          <template #item.trkid="{ item }">
            <v-chip
              color="primary"
              size="small"
              @click.stop="goToRoute(null, { item })"
            >
              {{ item.trkid }}
            </v-chip>
          </template>

          <!-- Total Stops column -->
          <template #item.totalStops="{ item }">
            <v-chip
              :color="(item.totalStops || 0) > 10 ? 'red' : (item.totalStops || 0) > 5 ? 'orange' : 'green'"
              size="small"
            >
              {{ item.totalStops || 0 }} stops
            </v-chip>
          </template>

          <!-- Customers column -->
          <template #item.customers="{ item }">
            <div v-if="routeCustomers.get(item._id) && routeCustomers.get(item._id)!.length > 0" class="d-flex flex-wrap ga-1">
              <v-chip
                v-for="customerId in routeCustomers.get(item._id)?.slice(0, 3)"
                :key="customerId"
                color="blue"
                size="x-small"
                variant="outlined"
              >
                {{ customerId }}
              </v-chip>
              <v-chip
                v-if="(routeCustomers.get(item._id)?.length || 0) > 3"
                color="grey"
                size="x-small"
                variant="outlined"
              >
                +{{ (routeCustomers.get(item._id)?.length || 0) - 3 }} more
              </v-chip>
            </div>
            <span v-else class="text-grey text-caption">No customers</span>
          </template>

          <!-- Estimated Time column -->
          <template #item.estimatedTime="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-clock-time-four</v-icon>
              <span class="text-caption">{{ getEstimatedTime(item) }}</span>
            </div>
          </template>

          <!-- Estimated Distance column -->
          <template #item.estimatedDistance="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-map-marker-distance</v-icon>
              <span class="text-caption">{{ getEstimatedDistance(item) }}</span>
            </div>
          </template>

          <!-- Default Driver column -->
          <template #item.defaultDriver="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-account-circle</v-icon>
              <span v-if="item.defaultDriverId && drivers.get(item.defaultDriverId)" class="text-caption">
                {{ drivers.get(item.defaultDriverId).firstName }} {{ drivers.get(item.defaultDriverId).lastName }}
              </span>
              <span v-else class="text-caption text-grey">Not assigned</span>
            </div>
          </template>

          <!-- Default Truck column -->
          <template #item.defaultTruck="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-truck</v-icon>
              <span v-if="item.truckNumber" class="text-caption">
                {{ item.truckNumber }}<span v-if="item.subUnitNumber">-{{ item.subUnitNumber }}</span>
              </span>
              <span v-else class="text-caption text-grey">Not assigned</span>
            </div>
          </template>

          <!-- Scanner column -->
          <template #item.scanner="{ item }">
            <div class="d-flex align-center">
              <v-icon class="mr-1" size="small">mdi-barcode-scan</v-icon>
              <span v-if="item.scanner" class="text-caption">
                {{ item.scanner }}
              </span>
              <span v-else class="text-caption text-grey">Not assigned</span>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Drivers and Fleet by Group -->
      <v-row class="mb-6">
        <!-- Drivers Card (Left Column) -->
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-account-supervisor" />
              Drivers ({{ terminalDrivers.length }})
              <v-spacer />
              <v-chip 
                v-if="terminal.group" 
                color="primary" 
                size="small" 
                variant="outlined"
              >
                {{ terminal.group }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <p class="text-caption text-grey mb-4">
                Drivers assigned to {{ terminal.group || 'this terminal' }} group
              </p>

              <v-data-table
                :headers="driverHeaders"
                :items="terminalDrivers"
                :loading="driversLoading"
                item-value="_id"
                density="compact"
              >
                <!-- Driver Name column -->
                <template #item.name="{ item }">
                  <div class="d-flex align-center">
                    <v-avatar color="primary" size="small" class="mr-2">
                      {{ getDriverInitials(item) }}
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium">{{ item.firstName }} {{ item.lastName }}</div>
                      <div class="text-caption text-grey">{{ item.geotab || 'No Geotab ID' }}</div>
                    </div>
                  </div>
                </template>

                <!-- Status column -->
                <template #item.status="{ item }">
                  <v-chip
                    :color="item.status === 'Hired' ? 'success' : item.status === 'Inactive' ? 'grey' : 'warning'"
                    size="small"
                  >
                    {{ item.status }}
                  </v-chip>
                </template>

                <!-- Default Route column -->
                <template #item.defaultRoute="{ item }">
                  <div v-if="getDriverRoute(item)" class="d-flex align-center">
                    <v-icon class="mr-1" size="small">mdi-map-marker-path</v-icon>
                    <v-chip
                      color="success"
                      size="small"
                      variant="outlined"
                      @click.stop="goToRoute(null, { item: getDriverRoute(item) })"
                    >
                      {{ getDriverRoute(item).trkid }}
                    </v-chip>
                  </div>
                  <span v-else class="text-caption text-grey">No route assigned</span>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Fleet Card (Right Column) -->
        <v-col cols="12" md="6">
          <v-card class="h-100">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-truck" />
              Fleet ({{ terminalFleet.length }})
              <v-spacer />
              <v-chip 
                v-if="terminal.group" 
                color="primary" 
                size="small" 
                variant="outlined"
              >
                {{ terminal.group }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <p class="text-caption text-grey mb-4">
                Fleet vehicles assigned to {{ terminal.group || 'this terminal' }} group
              </p>

              <v-data-table
                :headers="fleetHeaders"
                :items="terminalFleet"
                :loading="fleetLoading"
                item-value="_id"
                density="compact"
              >
                <!-- Truck ID column -->
                <template #item.truckID="{ item }">
                  <v-chip
                    color="blue"
                    size="small"
                  >
                    {{ item.truckID }}
                  </v-chip>
                </template>

                <!-- Vehicle Type column -->
                <template #item.vehicleType="{ item }">
                  <v-chip
                    :color="item.vehicleType === 'TT' ? 'deep-purple' : item.vehicleType === 'ST' ? 'teal' : 'grey'"
                    size="small"
                  >
                    {{ item.vehicleType === 'TT' ? 'Tractor Trailer' : item.vehicleType === 'ST' ? 'Straight Truck' : 'Unknown' }}
                  </v-chip>
                </template>

                <!-- Default Route column -->
                <template #item.defaultRoute="{ item }">
                  <div v-if="getVehicleRoute(item)" class="d-flex align-center">
                    <v-icon class="mr-1" size="small">mdi-map-marker-path</v-icon>
                    <v-chip
                      color="success"
                      size="small"
                      variant="outlined"
                      @click.stop="goToRoute(null, { item: getVehicleRoute(item) })"
                    >
                      {{ getVehicleRoute(item).trkid }}
                    </v-chip>
                  </div>
                  <span v-else class="text-caption text-grey">No route assigned</span>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { terminalToUrlId } from '@/utils/terminal-url-helpers'

  const authStore = useAuthStore()
  const router = useRouter()
  const currentRoute = useRoute()

  // Reactive data
  const loading = ref(true)
  const routesLoading = ref(false)
  const fleetLoading = ref(false)
  const driversLoading = ref(false)
  const terminalData = ref<any>(null)
  const terminalRoutes = ref<any[]>([])
  const terminalFleet = ref<any[]>([])
  const terminalDrivers = ref<any[]>([])
  const routeCustomers = ref<Map<string, string[]>>(new Map())
  const drivers = ref<Map<string, any>>(new Map())

  // Get terminal ID from URL
  const terminalId = (currentRoute.params.id as string) || ''

  // Computed
  const terminal = computed(() => terminalData.value)

  // Table headers for routes
  const routeHeaders = [
    { title: 'Route ID', key: 'trkid', sortable: true },
    { title: 'Default Driver', key: 'defaultDriver', sortable: false },
    { title: 'Default Truck', key: 'defaultTruck', sortable: false },
    { title: 'Scanner', key: 'scanner', sortable: false },
    { title: 'Stops', key: 'totalStops', sortable: true },
    { title: 'Est. Time', key: 'estimatedTime', sortable: false },
    { title: 'Est. Distance', key: 'estimatedDistance', sortable: false },
    { title: 'Customers', key: 'customers', sortable: false },
  ]

  // Table headers for fleet by group
  const fleetHeaders = [
    { title: 'Truck ID', key: 'truckID', sortable: true },
    { title: 'Type', key: 'vehicleType', sortable: true },
    { title: 'Default Route', key: 'defaultRoute', sortable: false },
  ]

  // Table headers for drivers by group
  const driverHeaders = [
    { title: 'Driver', key: 'name', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Default Route', key: 'defaultRoute', sortable: false },
  ]

  // Methods
  const loadTerminalDetails = async () => {
    try {
      loading.value = true

      // Load terminal by cName (URL parameter)
      // The backend service now supports lookup by cName directly
      const terminalResponse = await feathersClient.service('terminals').get(terminalId)
      terminalData.value = terminalResponse

      // Load terminal routes
      await loadTerminalRoutes()
      
      // Load drivers and fleet by group in background (don't await)
      loadTerminalDriversAndFleet()
    } catch (error) {
      console.error('Error loading terminal details:', error)
      terminalData.value = null
    } finally {
      loading.value = false
    }
  }

  const loadTerminalRoutes = async () => {
    try {
      routesLoading.value = true

      // Get all routes for this terminal - backend hooks will populate stops, times, and distances
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

      const routes = await getAllRecords(
        feathersClient.service('routes'),
        { terminalId: terminalData.value._id },
      )

      // Sort by creation date (newest first)
      terminalRoutes.value = routes.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      // Build customer mapping from route stops (now populated by backend)
      const customerMap = new Map<string, string[]>()
      for (const route of routes) {
        if (route.stops && Array.isArray(route.stops)) {
          const uniqueCustomers = [...new Set(
            route.stops.map((stop: any) => stop.cid).filter(Boolean)
          )]
          customerMap.set(route._id, uniqueCustomers)
        }
      }
      routeCustomers.value = customerMap

      // Load all drivers for default driver display
      const allDriversResponse = await feathersClient.service('drivers').find({
        query: { $limit: 1000 },
      })
      
      const driverMap = new Map()
      allDriversResponse.data.forEach((driver: any) => {
        driverMap.set(driver._id, driver)
      })
      drivers.value = driverMap

    } catch (error) {
      console.error('Error loading terminal routes:', error)
      terminalRoutes.value = []
      routeCustomers.value = new Map()
      drivers.value = new Map()
    } finally {
      routesLoading.value = false
    }
  }

  const loadTerminalDriversAndFleet = async () => {
    try {
      fleetLoading.value = true
      driversLoading.value = true

      if (!terminalData.value?.group) {
        console.log('Terminal has no group assigned, cannot load drivers and fleet by group')
        terminalFleet.value = []
        terminalDrivers.value = []
        return
      }

      const terminalGroup = terminalData.value.group
      console.log(`Loading drivers and fleet for terminal group: ${terminalGroup}`)

      // Get all records helper function
      const getAllRecords = async (service: any, query: any = {}) => {
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

      // Load fleet vehicles that have this terminal group in their groups array
      const fleetResponse = await getAllRecords(
        feathersClient.service('fleet'),
        { groups: { $in: [terminalGroup] } }
      )
      terminalFleet.value = fleetResponse
      console.log(`Loaded ${fleetResponse.length} fleet vehicles for group ${terminalGroup}`)

      // Load drivers that have this terminal group in their groups array  
      const driversResponse = await getAllRecords(
        feathersClient.service('drivers'),
        { groups: { $in: [terminalGroup] } }
      )
      terminalDrivers.value = driversResponse
      console.log(`Loaded ${driversResponse.length} drivers for group ${terminalGroup}`)

    } catch (error) {
      console.error('Error loading terminal drivers and fleet:', error)
      terminalFleet.value = []
      terminalDrivers.value = []
    } finally {
      fleetLoading.value = false
      driversLoading.value = false
    }
  }

  // Helper function to get driver initials
  const getDriverInitials = (driver: any): string => {
    const firstName = driver.firstName || ''
    const lastName = driver.lastName || ''
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'D'
  }

  // Helper function to find route assigned to a driver
  const getDriverRoute = (driver: any): any => {
    return terminalRoutes.value.find(route => route.defaultDriverId === driver._id)
  }

  // Helper function to find route assigned to a vehicle
  const getVehicleRoute = (vehicle: any): any => {
    return terminalRoutes.value.find(route => route.truckNumber === vehicle.truckID)
  }

  // Helper function to format date/time
  const formatDateTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Helper function to convert route name to URL-safe format
  const routeNameToUrlSafe = (trkid: string) => {
    return trkid.replace(/\./g, '-')
  }

  const goToRoute = (event: any, { item }: { item: any }) => {
    router.push(`/routes/${routeNameToUrlSafe(item.trkid)}`)
  }

  const goToRoutePlanning = () => {
    // Navigate to route planning page with terminal ID in route
    if (terminal.value?.name) {
      const urlId = terminalToUrlId(terminal.value)
      router.push(`/planning/${urlId}`)
    }
  }

  const goToDispatch = () => {
    // Navigate to dispatch page for this terminal using cName
    if (terminal.value?.name) {
      const urlId = terminalToUrlId(terminal.value)
      router.push(`/dispatch/terminals/${urlId}`)
    }
  }

  // Get estimated time for a route (now calculated by backend)
  const getEstimatedTime = (route: any): string => {
    if (route.estimatedDuration > 0) {
      // Format duration from minutes
      const hours = Math.floor(route.estimatedDuration / 60)
      const mins = route.estimatedDuration % 60
      
      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
      }
      return `${mins}m`
    }
    return 'N/A'
  }

  // Get estimated distance for a route (now calculated by backend)
  const getEstimatedDistance = (route: any): string => {
    if (route.estimatedDistance > 0) {
      return `${route.estimatedDistance.toFixed(1)} mi`
    }
    return 'N/A'
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadTerminalDetails()
  })
</script>

<style scoped>
/* Cursor pointer for clickable elements */
.cursor-pointer {
  cursor: pointer;
}

.v-data-table tbody tr {
  cursor: pointer;
}

.v-data-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
