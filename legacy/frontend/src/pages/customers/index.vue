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

    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 mb-2">Customers</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage customer information and track their route assignments
            </p>
          </div>
          <v-chip
            color="primary"
            size="large"
          >
            {{ customers.length }} Total Customers
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Statistics Cards -->
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
            <h3 class="text-h6">Total Customers</h3>
            <p class="text-h5 font-weight-bold text-primary">{{ customers.length }}</p>
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
            <p class="text-h5 font-weight-bold text-green">{{ getTotalStops() }}</p>
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
            <h3 class="text-h6">Active Routes</h3>
            <p class="text-h5 font-weight-bold text-blue">{{ getActiveRoutesCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              class="mb-2"
              color="orange"
              icon="mdi-chart-bar"
              size="32"
            />
            <h3 class="text-h6">Avg Stops/Customer</h3>
            <p class="text-h5 font-weight-bold text-orange">{{ getAverageStopsPerCustomer() }}</p>
          </v-card-text>
        </v-card>
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
          label="Search customers..."
          placeholder="Search by customer ID, name, or address"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="cityFilter"
          clearable
          hide-details
          :items="cityOptions"
          label="Filter by City"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="stateFilter"
          clearable
          hide-details
          :items="stateOptions"
          label="Filter by State"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- Customers Table -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-account-box" />
        Customers List ({{ searchFilteredCustomers.length }})
      </v-card-title>

      <v-data-table
        class="clickable-rows"
        :headers="headers"
        item-value="cid"
        :items="searchFilteredCustomers"
        :loading="loading"
        @click:row="handleRowClick"
      >
        <!-- Customer ID column -->
        <template #item.cid="{ item }">
          <v-chip
            color="primary"
            size="small"
            variant="outlined"
          >
            {{ item.cid }}
          </v-chip>
        </template>

        <!-- Customer Name column -->
        <template #item.custName="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.custName || 'Unknown Customer' }}</div>
            <div class="text-caption text-grey-darken-1">ID: {{ item.cid }}</div>
          </div>
        </template>

        <!-- Address column -->
        <template #item.address="{ item }">
          <div v-if="item.address">
            <div>{{ item.address }}</div>
            <div class="text-caption text-grey-darken-1">
              {{ item.city }}, {{ item.state }} {{ item.zipCode }}
            </div>
          </div>
          <span v-else class="text-grey">No address</span>
        </template>

        <!-- Routes count column -->
        <template #item.routeCount="{ item }">
          <v-chip
            :color="getRouteCountColor(item.routeCount)"
            size="small"
          >
            {{ item.routeCount }} {{ item.routeCount === 1 ? 'route' : 'routes' }}
          </v-chip>
        </template>

        <!-- Stops count column -->
        <template #item.stopCount="{ item }">
          <v-chip
            :color="getStopCountColor(item.stopCount)"
            size="small"
          >
            {{ item.stopCount }} {{ item.stopCount === 1 ? 'stop' : 'stops' }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const loading = ref(true)
  const customers = ref<any[]>([])
  const routeStops = ref<any[]>([])
  const routes = ref<any[]>([])
  const searchQuery = ref('')
  const cityFilter = ref(null)
  const stateFilter = ref(null)

  // Table headers
  const headers = [
    { title: 'Customer ID', key: 'cid', sortable: true },
    { title: 'Customer Name', key: 'custName', sortable: true },
    { title: 'Address', key: 'address', sortable: false },
    { title: 'Routes', key: 'routeCount', sortable: true },
    { title: 'Stops', key: 'stopCount', sortable: true },
  ]

  // Computed properties
  const cityOptions = computed(() => {
    const uniqueCities = new Set()
    for (const customer of customers.value) {
      if (customer.city) {
        uniqueCities.add(customer.city)
      }
    }
    return Array.from(uniqueCities).sort()
  })

  const stateOptions = computed(() => {
    const uniqueStates = new Set()
    for (const customer of customers.value) {
      if (customer.state) {
        uniqueStates.add(customer.state)
      }
    }
    return Array.from(uniqueStates).sort()
  })

  const filteredCustomers = computed(() => {
    let filtered = customers.value

    if (cityFilter.value) {
      filtered = filtered.filter(customer => customer.city === cityFilter.value)
    }

    if (stateFilter.value) {
      filtered = filtered.filter(customer => customer.state === stateFilter.value)
    }

    return filtered
  })

  const searchFilteredCustomers = computed(() => {
    let filtered = filteredCustomers.value

    if (searchQuery.value && searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase()

      filtered = filtered.filter(customer => {
        // Search across customer ID
        const cidMatch = customer.cid?.toLowerCase().includes(query)

        // Search across customer name
        const nameMatch = customer.custName?.toLowerCase().includes(query)

        // Search across address
        const addressMatch = customer.address?.toLowerCase().includes(query)

        // Search across city and state
        const locationMatch
          = customer.city?.toLowerCase().includes(query)
            || customer.state?.toLowerCase().includes(query)

        return cidMatch || nameMatch || addressMatch || locationMatch
      })
    }

    return filtered
  })

  // Methods
  const loadCustomers = async () => {
    try {
      loading.value = true

      // Load all records helper function
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

      // Load route stops and routes
      const [stopsData, routesData] = await Promise.all([
        getAllRecords(feathersClient.service('route-stops')),
        getAllRecords(feathersClient.service('routes')),
      ])

      routeStops.value = stopsData
      routes.value = routesData

      // Aggregate customer data from route stops
      const customerMap = new Map<string, any>()

      stopsData.forEach((stop: any) => {
        if (!stop.cid) return

        const customerId = stop.cid

        if (!customerMap.has(customerId)) {
          // Create new customer entry with first stop's data
          customerMap.set(customerId, {
            cid: customerId,
            custName: stop.custName || '',
            address: stop.address || '',
            city: stop.city || '',
            state: stop.state || '',
            zipCode: stop.zipCode || '',
            stopCount: 0,
            routeCount: 0,
            routes: new Set(),
          })
        }

        const customer = customerMap.get(customerId)

        // Update stop count
        customer.stopCount += 1

        // Track unique routes
        if (stop.routeId) {
          customer.routes.add(stop.routeId)
        }
      })

      // Convert routes set to count and create final customer array
      const customersArray = Array.from(customerMap.values()).map(customer => ({
        ...customer,
        routeCount: customer.routes.size,
        routes: undefined, // Remove the Set object
      }))

      // Sort by customer ID
      customers.value = customersArray.sort((a, b) => a.cid.localeCompare(b.cid))
    } catch (error) {
      console.error('Error loading customers:', error)
      customers.value = []
      routeStops.value = []
      routes.value = []
    } finally {
      loading.value = false
    }
  }

  const getTotalStops = (): number => {
    return customers.value.reduce((total, customer) => total + (customer.stopCount || 0), 0)
  }

  const getActiveRoutesCount = (): number => {
    const uniqueRoutes = new Set()
    for (const customer of customers.value) {
      // Count unique routes across all customers
      for (const stop of routeStops.value
      .filter(stop => stop.cid === customer.cid)) {
        if (stop.routeId) uniqueRoutes.add(stop.routeId)
      }
    }
    return uniqueRoutes.size
  }

  const getAverageStopsPerCustomer = (): string => {
    if (customers.value.length === 0) return '0'
    const average = getTotalStops() / customers.value.length
    return average.toFixed(1)
  }

  const getRouteCountColor = (routeCount: number): string => {
    if (!routeCount || routeCount === 0) return 'grey'
    if (routeCount === 1) return 'green'
    if (routeCount <= 3) return 'blue'
    return 'purple'
  }

  const getStopCountColor = (stopCount: number): string => {
    if (!stopCount || stopCount === 0) return 'grey'
    if (stopCount <= 2) return 'green'
    if (stopCount <= 5) return 'orange'
    return 'red'
  }

  const handleRowClick = (event: any, row: any) => {
    viewCustomer(row.item)
  }

  const viewCustomer = (customer: any) => {
    router.push(`/customers/${customer.cid}`)
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadCustomers()
  })
</script>

<style scoped>
.clickable-rows >>> tbody tr {
  cursor: pointer;
}

.clickable-rows >>> tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
