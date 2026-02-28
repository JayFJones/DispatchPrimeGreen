<template>
  <div>
    <!-- Welcome Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card color="primary" dark>
          <v-card-text class="text-center py-8">
            <v-icon class="mb-4" icon="mdi-truck-delivery" size="64" />
            <h1 class="text-h3 mb-2">Welcome to DispatchPrime</h1>
            <p class="text-h6 font-weight-light">
              Your comprehensive logistics and dispatch management solution
            </p>
            <div v-if="authStore.isAuthenticated" class="mt-4">
              <p class="text-h6">
                Welcome back, {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}!
              </p>
              <v-chip-group class="justify-center mt-2">
                <v-chip
                  v-for="roleName in authStore.getUserRoleNames()"
                  :key="roleName"
                  color="white"
                  size="small"
                  text-color="primary"
                >
                  {{ roleName }}
                </v-chip>
              </v-chip-group>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions Grid -->
    <v-row class="mb-6">
      <v-col cols="12">
        <h2 class="text-h4 mb-4">Quick Actions</h2>
      </v-col>

      <v-col
        v-for="action in quickActions"
        :key="action.title"
        cols="12"
        lg="3"
        md="4"
        sm="6"
      >
        <v-card
          class="text-center"
          :color="action.color"
          :disabled="action.disabled"
          height="200"
          hover
          @click="action.action"
        >
          <v-card-text class="d-flex flex-column align-center justify-center fill-height">
            <v-icon
              class="mb-3"
              :color="action.disabled ? 'grey' : 'white'"
              :icon="action.icon"
              size="48"
            />
            <h3 class="text-h6 mb-2" :class="action.disabled ? 'text-grey' : 'text-white'">
              {{ action.title }}
            </h3>
            <p class="text-body-2" :class="action.disabled ? 'text-grey-lighten-1' : 'text-grey-lighten-4'">
              {{ action.description }}
            </p>
            <v-chip
              v-if="action.disabled"
              class="mt-2"
              color="grey"
              size="x-small"
            >
              Coming Soon
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity / Statistics -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2" icon="mdi-chart-line" />
            Recent Activity
          </v-card-title>
          <v-card-text>
            <div class="text-center py-8">
              <v-icon class="mb-4" color="grey-lighten-2" icon="mdi-inbox" size="64" />
              <h3 class="text-h6 text-grey">No recent activity</h3>
              <p class="text-body-2 text-grey-lighten-1">
                Start using the system to see your activity here
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4" />
    </v-row>

    <!-- System Info -->
    <v-row v-if="authStore.isAdmin()">
      <v-col cols="12">
        <v-card color="grey-lighten-5">
          <v-card-title>
            <v-icon class="mr-2" icon="mdi-shield-crown" />
            System Administration
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="3" sm="6">
                <div class="text-center">
                  <v-icon class="mb-2" color="primary" icon="mdi-account-multiple" size="32" />
                  <h4 class="text-h6">Users</h4>
                  <p class="text-body-2 text-grey">Manage system users</p>
                </div>
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <div class="text-center">
                  <v-icon class="mb-2" color="primary" icon="mdi-cog" size="32" />
                  <h4 class="text-h6">Settings</h4>
                  <p class="text-body-2 text-grey">System configuration</p>
                </div>
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <div class="text-center">
                  <v-icon class="mb-2" color="primary" icon="mdi-file-document" size="32" />
                  <h4 class="text-h6">Audit Logs</h4>
                  <p class="text-body-2 text-grey">System activity logs</p>
                </div>
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <div class="text-center">
                  <v-icon class="mb-2" color="primary" icon="mdi-backup-restore" size="32" />
                  <h4 class="text-h6">Backup</h4>
                  <p class="text-body-2 text-grey">Data backup & restore</p>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const usersCount = ref(0)
  const driverCount = ref(0)
  const routeCount = ref(0)
  const terminalsCount = ref(0)
  const customersCount = ref(0)
  const fleetCount = ref(0)

  // Load counts
  const loadUserCount = async () => {
    try {
      const response = await feathersClient.service('users').find({
        query: { $limit: 0 }, // Get count only
      })
      usersCount.value = response.total || 0
    } catch {
      usersCount.value = 0
    }
  }

  const loadDriverCount = async () => {
    try {
      const response = await feathersClient.service('drivers').find({
        query: { $limit: 0 }, // Get count only
      })
      driverCount.value = response.total || 0
    } catch {
      driverCount.value = 0
    }
  }

  const loadRouteCount = async () => {
    try {
      const response = await feathersClient.service('routes').find({
        query: { $limit: 0 }, // Get count only
      })
      routeCount.value = response.total || 0
    } catch {
      routeCount.value = 0
    }
  }

  const loadTerminalsCount = async () => {
    try {
      const response = await feathersClient.service('terminals').find({
        query: { $limit: 0 }, // Get count only
      })
      terminalsCount.value = response.total || 0
    } catch {
      terminalsCount.value = 0
    }
  }

  const loadCustomersCount = async () => {
    try {
      // Load all route stops to get unique customers
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

      const stops = await getAllRecords(feathersClient.service('route-stops'))
      const uniqueCustomers = new Set(stops.map(stop => stop.cid).filter(Boolean))
      customersCount.value = uniqueCustomers.size
    } catch {
      customersCount.value = 0
    }
  }

  const loadFleetCount = async () => {
    try {
      const response = await feathersClient.service('fleet').find({
        query: { $limit: 0 }, // Get count only
      })
      fleetCount.value = response.total || 0
    } catch {
      fleetCount.value = 0
    }
  }

  const quickActions = computed(() => [
    {
      title: 'Operations Hub',
      description: 'Unified dispatch & driver management',
      icon: 'mdi-monitor-dashboard',
      color: 'primary',
      disabled: false,
      action: () => router.push('/operations-hub'),
    },
    {
      title: 'Live Dispatch',
      description: 'Real-time route monitoring',
      icon: 'mdi-radio-tower',
      color: 'red',
      disabled: false,
      action: () => router.push('/dispatch'),
    },
    {
      title: 'Planning',
      description: 'Route planning & scheduling',
      icon: 'mdi-calendar-clock',
      color: 'teal',
      disabled: false,
      action: () => router.push('/planning'),
    },
    {
      title: 'Routes',
      description: `${routeCount.value} routes`,
      icon: 'mdi-map-marker-path',
      color: 'blue',
      disabled: false,
      action: () => router.push('/routes'),
    },
    {
      title: 'Terminals',
      description: `${terminalsCount.value} terminals`,
      icon: 'mdi-office-building',
      color: 'green',
      disabled: false,
      action: () => router.push('/terminals'),
    },
    {
      title: 'Customers',
      description: `${customersCount.value} customers`,
      icon: 'mdi-account-box',
      color: 'orange',
      disabled: false,
      action: () => router.push('/customers'),
    },
    {
      title: 'Drivers',
      description: `${driverCount.value} drivers`,
      icon: 'mdi-account-hard-hat',
      color: 'indigo',
      disabled: false,
      action: () => router.push('/drivers'),
    },
    {
      title: 'Fleet',
      description: `${fleetCount.value} vehicles`,
      icon: 'mdi-truck',
      color: 'brown',
      disabled: false,
      action: () => router.push('/fleet'),
    },
    {
      title: 'Users',
      description: `${usersCount.value} users`,
      icon: 'mdi-account-multiple',
      color: 'purple',
      disabled: false,
      action: () => router.push('/admin/users'),
    },
    {
      title: 'Integration Testing',
      description: 'GEOtab & API testing tools',
      icon: 'mdi-api',
      color: 'cyan',
      disabled: !authStore.isAdmin(),
      action: () => router.push('/admin/'),
    },
  ])

  // Redirect to login if not authenticated
  onMounted(() => {
    if (authStore.isAuthenticated) {
      // Load counts if authenticated
      loadUserCount()
      loadDriverCount()
      loadRouteCount()
      loadTerminalsCount()
      loadCustomersCount()
      loadFleetCount()
    } else {
      router.push('/user-auth')
    }
  })
</script>

<style scoped>
.v-card:not(.v-card--disabled) {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.v-card:not(.v-card--disabled):hover {
  transform: translateY(-2px);
}
</style>
