<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 mb-2">Routes</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage and view route information including terminals, DCPs, and stops
            </p>
          </div>
          <v-chip
            color="primary"
            size="large"
          >
            {{ routes.length }} Total Routes
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          append-inner-icon="mdi-magnify"
          clearable
          hide-details
          label="Search routes..."
          placeholder="Search by route name, DCP, terminal name, or location"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="terminalFilter"
          clearable
          hide-details
          :items="terminalOptions"
          label="Filter by Terminal"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="customerFilter"
          clearable
          hide-details
          :items="customerOptions"
          label="Filter by Customer"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- Routes Table -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-map-marker-path" />
        Routes List
      </v-card-title>

      <v-data-table
        class="clickable-rows"
        :headers="headers"
        item-value="_id"
        :items="searchFilteredRoutes"
        :loading="loading"
        @click:row="handleRowClick"
      >
        <!-- Route ID column -->
        <template #item.trkid="{ item }">
          <v-chip
            color="primary"
            size="small"
            variant="outlined"
          >
            {{ item.trkid }}
          </v-chip>
        </template>

        <!-- Terminal column -->
        <template #item.terminal="{ item }">
          <div v-if="item.terminal" class="terminal-link" @click.stop="goToTerminal(item.terminal)">
            <div class="font-weight-medium text-primary">{{ item.terminal.name }}</div>
            <div class="text-caption text-grey-darken-1">{{ item.terminal.city }}, {{ item.terminal.state }}</div>
          </div>
          <span v-else class="text-grey">No terminal</span>
        </template>

        <!-- DCP column -->
        <template #item.dcp="{ item }">
          <v-chip
            v-if="item.terminal?.dcp"
            color="secondary"
            size="small"
          >
            {{ item.terminal.dcp }}
          </v-chip>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Truck Number column -->
        <template #item.truckNumber="{ item }">
          <div v-if="item.truckNumber || item.subUnitNumber" class="d-flex flex-column gap-1">
            <!-- Primary Truck -->
            <div v-if="item.truckNumber" class="d-flex align-center gap-1">
              <v-chip
                color="blue"
                size="small"
                variant="outlined"
              >
                <v-icon class="mr-1" :icon="getTruckIcon(item.truckNumber)" size="small" />
                {{ item.truckNumber }}
                <v-chip
                  v-if="getTruckType(item.truckNumber)"
                  class="ml-1"
                  :color="getTruckTypeColor(getTruckType(item.truckNumber))"
                  size="x-small"
                  variant="flat"
                >
                  {{ getTruckType(item.truckNumber) }}
                </v-chip>
              </v-chip>
            </div>
            <!-- Arrow and Sub-unit -->
            <div v-if="item.truckNumber && item.subUnitNumber" class="d-flex align-center gap-1">
              <v-icon color="grey" icon="mdi-arrow-down" size="x-small" />
              <v-chip
                color="orange"
                size="x-small"
                variant="outlined"
              >
                <v-icon class="mr-1" :icon="getTruckIcon(item.subUnitNumber)" size="x-small" />
                {{ item.subUnitNumber }}
                <v-chip
                  v-if="getTruckType(item.subUnitNumber)"
                  class="ml-1"
                  :color="getTruckTypeColor(getTruckType(item.subUnitNumber))"
                  size="x-small"
                  variant="flat"
                >
                  {{ getTruckType(item.subUnitNumber) }}
                </v-chip>
              </v-chip>
            </div>
            <!-- Sub-unit only -->
            <div v-if="!item.truckNumber && item.subUnitNumber">
              <v-chip
                color="orange"
                size="small"
                variant="outlined"
              >
                <v-icon class="mr-1" :icon="getTruckIcon(item.subUnitNumber)" size="small" />
                {{ item.subUnitNumber }}
                <v-chip
                  v-if="getTruckType(item.subUnitNumber)"
                  class="ml-1"
                  :color="getTruckTypeColor(getTruckType(item.subUnitNumber))"
                  size="x-small"
                  variant="flat"
                >
                  {{ getTruckType(item.subUnitNumber) }}
                </v-chip>
              </v-chip>
            </div>
          </div>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Assigned Driver column -->
        <template #item.defaultDriver="{ item }">
          <div v-if="item.defaultDriver" class="driver-link" @click.stop="goToDriver(item.defaultDriver)">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="primary" icon="mdi-account" size="small" />
              <div>
                <div class="font-weight-medium text-primary">{{ item.defaultDriver.firstName }} {{ item.defaultDriver.lastName }}</div>
                <div class="text-caption text-grey-darken-1">Default Driver</div>
              </div>
            </div>
          </div>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Fuel Card column -->
        <template #item.fuelCard="{ item }">
          <v-chip
            v-if="item.fuelCard"
            color="orange"
            size="small"
            variant="outlined"
          >
            <v-icon class="mr-1" icon="mdi-credit-card" size="small" />
            {{ item.fuelCard }}
          </v-chip>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Scanner column -->
        <template #item.scanner="{ item }">
          <v-chip
            v-if="item.scanner"
            color="purple"
            size="small"
            variant="outlined"
          >
            <v-icon class="mr-1" icon="mdi-barcode-scan" size="small" />
            {{ item.scanner }}
          </v-chip>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Stops count column -->
        <template #item.totalStops="{ item }">
          <v-chip
            :color="getStopsColor(item?.totalStops)"
            size="small"
          >
            {{ item?.totalStops || 0 }} stops
          </v-chip>
        </template>

        <!-- Customers column -->
        <template #item.customers="{ item }">
          <div v-if="routeCustomers.get(item._id)?.length > 0" class="d-flex flex-wrap ga-1">
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

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              color="primary"
              icon="mdi-calendar-clock"
              size="small"
              variant="text"
              @click.stop="goToRoutePlanning(item)"
            >
              <v-icon>mdi-calendar-clock</v-icon>
              <v-tooltip activator="parent" location="top">
                Route Planning
              </v-tooltip>
            </v-btn>
            <v-btn
              color="secondary"
              icon="mdi-eye"
              size="small"
              variant="text"
              @click.stop="goToRoute(item)"
            >
              <v-icon>mdi-eye</v-icon>
              <v-tooltip activator="parent" location="top">
                View Details
              </v-tooltip>
            </v-btn>
          </div>
        </template>

      </v-data-table>
    </v-card>

    <!-- Loading overlay -->
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
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { terminalToUrlId } from '@/utils/terminal-url-helpers'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const loading = ref(true)
  const routes = ref<any[]>([])
  const terminals = ref<any[]>([])
  const routeStops = ref<any[]>([])
  const routeCustomers = ref<Map<string, string[]>>(new Map())
  const equipmentData = ref<Map<string, any>>(new Map())
  const driversData = ref<Map<string, any>>(new Map())
  const searchQuery = ref('')
  const terminalFilter = ref(null)
  const customerFilter = ref(null)

  // Table headers
  const headers = [
    { title: 'Route ID', key: 'trkid', sortable: true },
    { title: 'Terminal', key: 'terminal', sortable: false },
    { title: 'DCP', key: 'dcp', sortable: false },
    { title: 'Equipment', key: 'truckNumber', sortable: true },
    { title: 'Assigned Driver', key: 'defaultDriver', sortable: false },
    { title: 'Fuel Card', key: 'fuelCard', sortable: true },
    { title: 'Scanner', key: 'scanner', sortable: true },
    { title: 'Stops', key: 'totalStops', sortable: true },
    { title: 'Customers', key: 'customers', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false, width: '120px' },
  ]

  // Computed properties
  const terminalOptions = computed(() => {
    const uniqueTerminals = new Set()
    for (const route of routes.value) {
      if (route.terminal?.name) {
        uniqueTerminals.add(route.terminal.name)
      }
    }
    return Array.from(uniqueTerminals).sort()
  })

  const customerOptions = computed(() => {
    const uniqueCustomers = new Set()
    for (const [routeId, customers] of routeCustomers.value) {
      for (const customerId of customers) {
        if (customerId) {
          uniqueCustomers.add(customerId)
        }
      }
    }
    return Array.from(uniqueCustomers).sort()
  })

  const filteredRoutes = computed(() => {
    let filtered = routes.value

    if (terminalFilter.value) {
      filtered = filtered.filter(route => route.terminal?.name === terminalFilter.value)
    }

    if (customerFilter.value) {
      filtered = filtered.filter(route => {
        const routeCustomersList = routeCustomers.value.get(route._id) || []
        return routeCustomersList.includes(customerFilter.value)
      })
    }

    return filtered
  })

  const searchFilteredRoutes = computed(() => {
    let filtered = filteredRoutes.value

    if (searchQuery.value && searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase()

      filtered = filtered.filter(route => {
        // Search across route name (trkid)
        const routeNameMatch = route.trkid?.toLowerCase().includes(query)

        // Search across terminal name
        const terminalNameMatch = route.terminal?.name?.toLowerCase().includes(query)

        // Search across DCP name
        const dcpMatch = route.terminal?.dcp?.toLowerCase().includes(query)

        // Search across terminal location (city, state, fullName)
        const terminalLocationMatch
          = route.terminal?.city?.toLowerCase().includes(query)
            || route.terminal?.state?.toLowerCase().includes(query)
            || route.terminal?.fullName?.toLowerCase().includes(query)

        return routeNameMatch || terminalNameMatch || dcpMatch || terminalLocationMatch
      })
    }

    return filtered
  })

  // Helper function to convert route name to URL-safe format
  const routeNameToUrlSafe = (trkid: string) => {
    return trkid.replace(/\./g, '-')
  }

  // Methods
  const loadRoutes = async () => {
    try {
      loading.value = true

      // Load routes with pagination to get all records
      const getAllRecords = async (service: any) => {
        const countResult = await service.find({ query: { $limit: 0 } })
        const total = countResult.total

        if (total === 0) return []

        const allRecords: any[] = []
        const limit = 1000
        let skip = 0

        while (skip < total) {
          const result = await service.find({
            query: { $limit: limit, $skip: skip },
          })
          allRecords.push(...result.data)

          if (result.data.length < limit) break
          skip += limit
        }

        return allRecords
      }

      // Load routes and terminals
      const [routesData, terminalsData] = await Promise.all([
        getAllRecords(feathersClient.service('routes')),
        getAllRecords(feathersClient.service('terminals')),
      ])

      // Create terminal lookup map
      const terminalMap = new Map()
      terminalsData.forEach((terminal: any) => {
        terminalMap.set(terminal._id.toString(), terminal)
      })

      // Load drivers data
      const driversResponse = await getAllRecords(feathersClient.service('drivers'))
      const driverMap = new Map()
      driversResponse.forEach((driver: any) => {
        driverMap.set(driver._id.toString(), driver)
      })
      driversData.value = driverMap

      // Enhance routes with terminal and driver data
      routes.value = routesData.map((route: any) => ({
        ...route,
        terminal: route.terminalId ? terminalMap.get(route.terminalId.toString()) : null,
        defaultDriver: route.defaultDriverId ? driverMap.get(route.defaultDriverId.toString()) : null,
      }))

      terminals.value = terminalsData

      // Load route stops for customer information
      if (routesData.length > 0) {
        const routeIds = new Set(routesData.map(route => route._id))
        const stops = await getAllRecords(feathersClient.service('route-stops'))

        // Filter stops for our routes
        const relevantStops = stops.filter(stop => routeIds.has(stop.routeId))
        routeStops.value = relevantStops

        // Build customer mapping for each route
        const customerMap = new Map<string, string[]>()
        for (const route of routesData) {
          const routeStopsForRoute = relevantStops.filter(stop => stop.routeId === route._id)
          const uniqueCustomers = [...new Set(routeStopsForRoute.map(stop => stop.cid).filter(Boolean))]
          customerMap.set(route._id, uniqueCustomers)
        }
        routeCustomers.value = customerMap
      }

      // Load equipment data for truck types and icons
      await loadEquipmentData()
    } catch (error) {
      console.error('Error loading routes:', error)
    } finally {
      loading.value = false
    }
  }

  const getStopsColor = (stopCount: number): string => {
    if (!stopCount || stopCount === 0) return 'grey'
    if (stopCount <= 5) return 'green'
    if (stopCount <= 10) return 'orange'
    return 'red'
  }

  const handleRowClick = (event: any, row: any) => {
    viewRoute(row.item)
  }

  const viewRoute = (route: any) => {
    router.push(`/routes/${routeNameToUrlSafe(route.trkid)}`)
  }

  const loadEquipmentData = async () => {
    try {
      // Collect all equipment numbers from routes
      const equipmentNumbers: string[] = []
      for (const route of routes.value) {
        if (route.truckNumber) equipmentNumbers.push(route.truckNumber)
        if (route.subUnitNumber) equipmentNumbers.push(route.subUnitNumber)
      }

      if (equipmentNumbers.length === 0) return

      // Remove duplicates
      const uniqueEquipmentNumbers = [...new Set(equipmentNumbers)]

      // Load equipment information
      const equipmentResponse = await feathersClient.service('equipment').find({
        query: {
          equipmentNumber: { $in: uniqueEquipmentNumbers },
          $limit: uniqueEquipmentNumbers.length,
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

  const goToTerminal = (terminal: any) => {
    if (terminal?.name) {
      const urlId = terminalToUrlId(terminal)
      router.push(`/terminals/${urlId}`)
    }
  }

  const goToDriver = (driver: any) => {
    if (driver?._id) {
      router.push(`/drivers/${driver._id}`)
    }
  }

  const goToRoute = (route: any) => {
    if (route?.trkid) {
      router.push(`/routes/${routeNameToUrlSafe(route.trkid)}`)
    }
  }

  const goToRoutePlanning = (route: any) => {
    if (route?.trkid) {
      router.push(`/routes/${routeNameToUrlSafe(route.trkid)}/planning`)
    }
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadRoutes()
  })
</script>

<style scoped>
.clickable-rows >>> tbody tr {
  cursor: pointer;
}

.clickable-rows >>> tbody tr:hover {
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

.driver-link {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.driver-link:hover {
  background-color: rgba(25, 118, 210, 0.04);
  transform: translateX(2px);
}
</style>
