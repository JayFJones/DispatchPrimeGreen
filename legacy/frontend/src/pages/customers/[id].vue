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

    <!-- Customer not found -->
    <v-alert
      v-if="!loading && !customer"
      color="error"
      icon="mdi-alert-circle"
      title="Customer Not Found"
      type="error"
    >
      The requested customer could not be found.
      <template #append>
        <v-btn
          color="white"
          variant="outlined"
          @click="router.push('/customers')"
        >
          Back to Customers
        </v-btn>
      </template>
    </v-alert>

    <!-- Customer details -->
    <div v-if="!loading && customer">
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="router.push('/customers')"
            />
            <div class="ml-3">
              <h1 class="text-h4 mb-1">{{ customer.custName || 'Unknown Customer' }}</h1>
              <p class="text-body-1 text-grey-darken-1">
                Customer ID: {{ customerId }} • {{ customer.stopCount }} {{ customer.stopCount === 1 ? 'stop' : 'stops' }} across {{ customer.routeCount }} {{ customer.routeCount === 1 ? 'route' : 'routes' }}
              </p>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Customer Overview Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="primary"
                icon="mdi-account-box"
                size="32"
              />
              <h3 class="text-h6">Customer ID</h3>
              <p class="text-h5 font-weight-bold text-primary">{{ customer.cid }}</p>
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
              <p class="text-h5 font-weight-bold text-green">{{ customer.stopCount }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="blue"
                icon="mdi-map-marker-path"
                size="32"
              />
              <h3 class="text-h6">Routes</h3>
              <p class="text-h5 font-weight-bold text-blue">{{ customer.routeCount }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="orange"
                icon="mdi-office-building"
                size="32"
              />
              <h3 class="text-h6">Terminals</h3>
              <p class="text-h5 font-weight-bold text-orange">{{ getUniqueTerminals() }}</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Customer Information -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-information" />
              Customer Information
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>Customer ID:</strong>
                </v-col>
                <v-col cols="6">
                  {{ customer.cid }}
                </v-col>

                <v-col cols="6">
                  <strong>Customer Name:</strong>
                </v-col>
                <v-col cols="6">
                  {{ customer.custName || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Address:</strong>
                </v-col>
                <v-col cols="6">
                  {{ customer.address || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>City:</strong>
                </v-col>
                <v-col cols="6">
                  {{ customer.city || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>State:</strong>
                </v-col>
                <v-col cols="6">
                  {{ customer.state || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>ZIP Code:</strong>
                </v-col>
                <v-col cols="6">
                  {{ customer.zipCode || 'N/A' }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-chart-bar" />
              Route Statistics
            </v-card-title>
            <v-card-text>
              <div v-if="customerStops.length > 0">
                <v-row>
                  <v-col cols="6">
                    <strong>Total Stops:</strong>
                  </v-col>
                  <v-col cols="6">
                    {{ customerStops.length }}
                  </v-col>

                  <v-col cols="6">
                    <strong>Total Routes:</strong>
                  </v-col>
                  <v-col cols="6">
                    {{ getUniqueRoutes() }}
                  </v-col>

                  <v-col cols="6">
                    <strong>Terminals Served:</strong>
                  </v-col>
                  <v-col cols="6">
                    {{ getUniqueTerminals() }}
                  </v-col>

                  <v-col cols="6">
                    <strong>States Served:</strong>
                  </v-col>
                  <v-col cols="6">
                    {{ getUniqueStates() }}
                  </v-col>
                </v-row>
              </div>
              <div v-else class="text-center py-4">
                <v-icon class="mb-2" color="grey" icon="mdi-map-marker-off" size="48" />
                <p class="text-grey">No route stops found for this customer</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Customer Stops Table -->
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" icon="mdi-map-marker-multiple" />
          Customer Stops ({{ customerStops.length }})
        </v-card-title>

        <v-data-table
          :headers="stopHeaders"
          item-value="_id"
          :items="customerStops"
          :loading="stopsLoading"
        >
          <!-- Sequence column -->
          <template #item.sequence="{ item }">
            <v-chip
              color="primary"
              size="small"
            >
              {{ item.sequence }}
            </v-chip>
          </template>

          <!-- Route column -->
          <template #item.route="{ item }">
            <v-chip
              v-if="item.route"
              color="blue"
              size="small"
              variant="outlined"
              @click.stop="goToRoute(null, { item: item.route })"
            >
              {{ item.route.trkid }}
            </v-chip>
            <span v-else class="text-grey">No route</span>
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
            <span class="text-body-2">{{ convertFloatToTime(item.eta) }}</span>
          </template>

          <!-- ETD column -->
          <template #item.etd="{ item }">
            <span class="text-body-2">{{ convertFloatToTime(item.etd) }}</span>
          </template>

          <!-- Commit Time column -->
          <template #item.commitTime="{ item }">
            <span class="text-body-2">{{ convertFloatToTime(item.commitTime) }}</span>
          </template>
        </v-data-table>
      </v-card>
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
  const customer = ref<any>(null)
  const customerStops = ref<any[]>([])
  const customerRoutes = ref<any[]>([])
  const terminals = ref<any[]>([])

  // Get customer ID from URL
  const customerId = currentRoute.params.id as string

  // Table headers for stops
  const stopHeaders = [
    { title: 'Seq', key: 'sequence', sortable: true, width: '80px' },
    { title: 'Route', key: 'route', sortable: false },
    { title: 'Address', key: 'address', sortable: false },
    { title: 'ETA', key: 'eta', sortable: false },
    { title: 'ETD', key: 'etd', sortable: false },
    { title: 'Commit', key: 'commitTime', sortable: false },
  ]

  // Methods
  const loadCustomerDetails = async () => {
    try {
      loading.value = true

      // Load all records helper function
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

      // Load customer stops for this customer ID
      const stops = await getAllRecords(
        feathersClient.service('route-stops'),
        { cid: customerId },
      )

      if (stops.length === 0) {
        customer.value = null
        return
      }

      // Create customer object from first stop (they should all have same customer info)
      const firstStop = stops[0]
      customer.value = {
        cid: customerId,
        custName: firstStop.custName || '',
        address: firstStop.address || '',
        city: firstStop.city || '',
        state: firstStop.state || '',
        zipCode: firstStop.zipCode || '',
        stopCount: stops.length,
        routeCount: 0,
      }

      customerStops.value = stops.sort((a, b) => (a.sequence || 0) - (b.sequence || 0))

      // Load related data
      await loadCustomerRoutes(stops)
    } catch (error) {
      console.error('Error loading customer details:', error)
      customer.value = null
    } finally {
      loading.value = false
    }
  }

  const loadCustomerRoutes = async (stops: any[]) => {
    try {
      // Get unique route IDs
      const routeIds = [...new Set(stops.map(stop => stop.routeId).filter(Boolean))]

      if (routeIds.length === 0) {
        customer.value.routeCount = 0
        return
      }

      // Load all records helper function
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

      // Load routes and terminals
      const [allRoutes, allTerminals] = await Promise.all([
        getAllRecords(feathersClient.service('routes')),
        getAllRecords(feathersClient.service('terminals')),
      ])

      terminals.value = allTerminals

      // Create terminal lookup map
      const terminalMap = new Map()
      allTerminals.forEach((terminal: any) => {
        terminalMap.set(terminal._id.toString(), terminal)
      })

      // Filter routes that contain this customer and enhance with terminal data
      const routes = allRoutes
        .filter((route: any) => routeIds.includes(route._id))
        .map((route: any) => {
          // Count customer stops in this route
          const customerStopsInRoute = stops.filter(stop => stop.routeId === route._id).length

          return {
            ...route,
            terminal: route.terminalId ? terminalMap.get(route.terminalId.toString()) : null,
            customerStops: customerStopsInRoute,
          }
        })

      customerRoutes.value = routes.sort((a, b) => a.trkid.localeCompare(b.trkid))
      customer.value.routeCount = routes.length

      // Enhance stops with route information
      const routeMap = new Map()
      routes.forEach((route: any) => {
        routeMap.set(route._id.toString(), route)
      })

      customerStops.value = customerStops.value.map(stop => ({
        ...stop,
        route: stop.routeId ? routeMap.get(stop.routeId.toString()) : null,
      }))
    } catch (error) {
      console.error('Error loading customer routes:', error)
      customerRoutes.value = []
      customer.value.routeCount = 0
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

  const getUniqueRoutes = (): number => {
    return customerRoutes.value.length
  }

  const getUniqueTerminals = (): number => {
    const uniqueTerminals = new Set()
    for (const route of customerRoutes.value) {
      if (route.terminal?._id) {
        uniqueTerminals.add(route.terminal._id)
      }
    }
    return uniqueTerminals.size
  }

  const getUniqueStates = (): number => {
    const uniqueStates = new Set()
    for (const stop of customerStops.value) {
      if (stop.state) {
        uniqueStates.add(stop.state)
      }
    }
    return uniqueStates.size
  }

  // Helper function to convert route name to URL-safe format
  const routeNameToUrlSafe = (trkid: string) => {
    return trkid.replace(/\./g, '-')
  }

  const goToRoute = (event: any, { item }: { item: any }) => {
    router.push(`/routes/${routeNameToUrlSafe(item.trkid)}`)
  }

  const goToTerminal = (terminal: any) => {
    if (terminal?.name) {
      const urlId = terminalToUrlId(terminal)
      router.push(`/terminals/${urlId}`)
    }
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadCustomerDetails()
  })
</script>

<style scoped>
.v-data-table tbody tr {
  cursor: pointer;
}

.v-data-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.terminal-link {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.terminal-link:hover {
  background-color: rgba(25, 118, 210, 0.04);
  transform: translateX(2px);
}
</style>
