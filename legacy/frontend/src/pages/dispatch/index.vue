<template>
  <div>
    <!-- Show Terminal Dispatch View if terminalId is provided -->
    <div v-if="$route.query.terminalId">
      <DispatchTerminalView />
    </div>

    <!-- Show Terminal List View if no terminalId -->
    <div v-else>
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="d-flex align-center">
              <v-btn
                icon="mdi-arrow-left"
                variant="text"
                @click="router.push('/')"
              />
              <div class="ml-3">
                <h1 class="text-h4 mb-1">Live Dispatch Dashboard</h1>
                <p class="text-body-1 text-grey-darken-1">
                  Monitor active routes and dispatch operations in real-time
                </p>
              </div>
            </div>
            
            <!-- Real-time Fleet Tracking Button (only show when viewing a specific terminal) -->
            <v-btn
              v-if="$route.query.terminalId"
              color="primary"
              prepend-icon="mdi-map-marker-radius"
              variant="elevated"
              @click="showRealTimeDialog = true"
            >
              Real-time Fleet
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <!-- Summary Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card color="red" dark>
            <v-card-text class="text-center">
              <v-icon class="mb-2" icon="mdi-clock-alert" size="48" />
              <h3 class="text-h4">{{ activeSummary.urgent }}</h3>
              <p class="text-body-1">Urgent Routes</p>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="orange" dark>
            <v-card-text class="text-center">
              <v-icon class="mb-2" icon="mdi-truck-fast" size="48" />
              <h3 class="text-h4">{{ activeSummary.inTransit }}</h3>
              <p class="text-body-1">In Transit</p>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="blue" dark>
            <v-card-text class="text-center">
              <v-icon class="mb-2" icon="mdi-clock-start" size="48" />
              <h3 class="text-h4">{{ activeSummary.starting }}</h3>
              <p class="text-body-1">Starting Soon</p>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="green" dark>
            <v-card-text class="text-center">
              <v-icon class="mb-2" icon="mdi-check-circle" size="48" />
              <h3 class="text-h4">{{ activeSummary.completed }}</h3>
              <p class="text-body-1">Completed Today</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="search"
            clearable
            label="Search terminals..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="selectedState"
            clearable
            :items="availableStates"
            label="Filter by State"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="statusFilter"
            :items="statusOptions"
            label="Status Filter"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <!-- Terminal Cards -->
      <v-row>
        <v-col
          v-for="terminal in filteredTerminals"
          :key="terminal._id"
          cols="12"
          lg="4"
          md="6"
        >
          <v-card
            class="terminal-card"
            height="300"
            hover
            @click="goToTerminalDispatch(terminal._id)"
          >
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" icon="mdi-office-building" />
                {{ terminal.name }}
              </div>
              <v-chip
                :color="getTerminalStatusColor(terminal)"
                size="small"
                variant="elevated"
              >
                {{ getTerminalStatus(terminal) }}
              </v-chip>
            </v-card-title>

            <v-card-subtitle v-if="terminal.city || terminal.state">
              <v-icon class="mr-1" icon="mdi-map-marker" size="small" />
              {{ terminal.city }}{{ terminal.city && terminal.state ? ', ' : '' }}{{ terminal.state }}
            </v-card-subtitle>

            <v-card-text>
              <!-- Route Status Summary -->
              <div class="mb-4">
                <h4 class="text-subtitle-1 mb-2">Today's Routes</h4>
                <v-row dense>
                  <v-col cols="6">
                    <div class="text-center">
                      <div class="text-h6 text-blue">{{ getTerminalRouteCount(terminal._id, 'active') }}</div>
                      <div class="text-caption">Active</div>
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-center">
                      <div class="text-h6 text-green">{{ getTerminalRouteCount(terminal._id, 'completed') }}</div>
                      <div class="text-caption">Completed</div>
                    </div>
                  </v-col>
                </v-row>
              </div>

              <!-- Recent Activity -->
              <div>
                <h4 class="text-subtitle-1 mb-2">Recent Activity</h4>
                <div v-if="getRecentActivity(terminal._id).length > 0">
                  <div
                    v-for="activity in getRecentActivity(terminal._id).slice(0, 2)"
                    :key="activity.id"
                    class="d-flex align-center mb-1"
                  >
                    <v-icon
                      class="mr-2"
                      :color="getActivityColor(activity.type)"
                      :icon="getActivityIcon(activity.type)"
                      size="small"
                    />
                    <span class="text-caption">{{ activity.message }}</span>
                  </div>
                </div>
                <div v-else class="text-caption text-grey">
                  No recent activity
                </div>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn
                color="primary"
                size="small"
                variant="text"
                @click.stop="goToTerminalDispatch(terminal._id)"
              >
                View Dispatch
                <v-icon class="ml-1" size="small">mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Loading State -->
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
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'
  import { terminalToUrlId, findTerminalByUrlId } from '@/utils/terminal-url-helpers'
  import DispatchTerminalView from './terminals/[id].vue'

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // Reactive data
  const loading = ref(true)
  const terminals = ref<any[]>([])
  const todaysRoutes = ref<any[]>([])
  const search = ref('')
  const selectedState = ref('')
  const statusFilter = ref('all')


  // Computed data
  const activeSummary = computed(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    return {
      urgent: todaysRoutes.value.filter(route =>
        route.priority === 'urgent' && route.status !== 'completed',
      ).length,
      inTransit: todaysRoutes.value.filter(route =>
        route.status === 'in-transit',
      ).length,
      starting: todaysRoutes.value.filter(route => {
        if (route.status !== 'planned' && route.status !== 'assigned') return false
        if (!route.plannedDepartureTime) return false

        const departureTime = new Date(`${today} ${route.plannedDepartureTime}`)
        const timeDiff = departureTime.getTime() - now.getTime()
        const hoursDiff = timeDiff / (1000 * 60 * 60)

        return hoursDiff <= 2 && hoursDiff > 0
      }).length,
      completed: todaysRoutes.value.filter(route =>
        route.status === 'completed',
      ).length,
    }
  })

  const availableStates = computed(() => {
    const states = terminals.value
      .map(terminal => terminal.state)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
    return states
  })

  const statusOptions = [
    { title: 'All Terminals', value: 'all' },
    { title: 'Active', value: 'active' },
    { title: 'Idle', value: 'idle' },
    { title: 'Alert', value: 'alert' },
  ]

  const filteredTerminals = computed(() => {
    let filtered = terminals.value

    // Search filter
    if (search.value) {
      const searchLower = search.value.toLowerCase()
      filtered = filtered.filter(terminal =>
        terminal.name.toLowerCase().includes(searchLower)
        || terminal.city?.toLowerCase().includes(searchLower)
        || terminal.state?.toLowerCase().includes(searchLower),
      )
    }

    // State filter
    if (selectedState.value) {
      filtered = filtered.filter(terminal => terminal.state === selectedState.value)
    }

    // Status filter
    if (statusFilter.value !== 'all') {
      filtered = filtered.filter(terminal => {
        const status = getTerminalStatus(terminal)
        return status.toLowerCase() === statusFilter.value
      })
    }

    return filtered
  })

  // Methods
  const loadTerminals = async () => {
    try {
      const response = await feathersClient.service('terminals').find({
        query: { $limit: 1000, $sort: { name: 1 } },
      })
      terminals.value = response.data || []
    } catch (error) {
      console.error('Error loading terminals:', error)
      terminals.value = []
    }
  }

  const loadTodaysRoutes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await feathersClient.service('dispatched-routes').find({
        query: {
          executionDate: today,
          $limit: 1000,
          $sort: { plannedDepartureTime: 1 },
        },
      })
      todaysRoutes.value = response.data || []
    } catch (error) {
      console.error('Error loading today\'s routes:', error)
      todaysRoutes.value = []
    }
  }

  const getTerminalStatus = (terminal: any): string => {
    const terminalRoutes = getTerminalRoutes(terminal._id)

    if (terminalRoutes.length === 0) return 'Idle'

    const urgentRoutes = terminalRoutes.filter(route => route.priority === 'urgent')
    if (urgentRoutes.length > 0) return 'Alert'

    const activeRoutes = terminalRoutes.filter(route =>
      route.status === 'in-transit' || route.status === 'dispatched',
    )
    if (activeRoutes.length > 0) return 'Active'

    return 'Scheduled'
  }

  const getTerminalStatusColor = (terminal: any): string => {
    const status = getTerminalStatus(terminal)
    switch (status) {
      case 'Alert': { return 'red'
      }
      case 'Active': { return 'orange'
      }
      case 'Scheduled': { return 'blue'
      }
      case 'Idle': { return 'grey'
      }
      default: { return 'grey'
      }
    }
  }

  const getTerminalRoutes = (terminalId: string) => {
    return todaysRoutes.value.filter(route => {
      // We need to match routes to terminals through the route service
      // For now, we'll use a simple approach - this can be improved
      return route.terminalId === terminalId
    })
  }

  const getTerminalRouteCount = (terminalId: string, status: string): number => {
    const terminalRoutes = getTerminalRoutes(terminalId)

    if (status === 'active') {
      return terminalRoutes.filter(route =>
        route.status === 'in-transit'
        || route.status === 'dispatched'
        || route.status === 'assigned',
      ).length
    }

    if (status === 'completed') {
      return terminalRoutes.filter(route => route.status === 'completed').length
    }

    return terminalRoutes.length
  }

  const getRecentActivity = (terminalId: string) => {
    // Mock recent activity - in real implementation, this would come from activity logs
    const terminalRoutes = getTerminalRoutes(terminalId)
    const activities: any[] = []

    for (const route of terminalRoutes) {
      if (route.status === 'completed') {
        activities.push({
          id: `${route._id}-completed`,
          type: 'completed',
          message: `Route ${route.routeId} completed`,
          timestamp: new Date(),
        })
      } else if (route.status === 'in-transit') {
        activities.push({
          id: `${route._id}-transit`,
          type: 'transit',
          message: `Route ${route.routeId} in transit`,
          timestamp: new Date(),
        })
      }
    }

    return activities.sort((a, b) => b.timestamp - a.timestamp)
  }

  const getActivityColor = (type: string): string => {
    switch (type) {
      case 'completed': { return 'green'
      }
      case 'transit': { return 'blue'
      }
      case 'delayed': { return 'orange'
      }
      case 'alert': { return 'red'
      }
      default: { return 'grey'
      }
    }
  }

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'completed': { return 'mdi-check-circle'
      }
      case 'transit': { return 'mdi-truck-fast'
      }
      case 'delayed': { return 'mdi-clock-alert'
      }
      case 'alert': { return 'mdi-alert'
      }
      default: { return 'mdi-information'
      }
    }
  }

  const goToTerminalDispatch = (terminalId: string) => {
    // Find the terminal object by its ObjectID
    console.log('goToTerminalDispatch called with terminalId:', terminalId)
    console.log('Available terminals:', terminals.value.length)

    const terminal = terminals.value.find(t => t._id === terminalId)
    console.log('Found terminal:', terminal)

    if (terminal?.name) {
      console.log('Terminal name:', terminal.name)
      const urlId = terminalToUrlId(terminal)
      console.log('Generated URL ID:', urlId)
      router.push(`/dispatch?terminalId=${urlId}`)
    } else {
      console.error('Terminal not found or no name:', terminalId, terminal)
    }
  }


  // Lifecycle
  onMounted(async () => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    // If terminalId is provided, the template will show DispatchTerminalView component
    const terminalId = route.query.terminalId as string
    if (terminalId) {
      // Don't redirect - let the template handle showing the terminal dispatch view
      loading.value = true
      try {
        await loadTerminals()
      } catch (error) {
        console.error('Error loading terminals:', error)
      } finally {
        loading.value = false
      }
      return
    }

    loading.value = true
    try {
      await Promise.all([
        loadTerminals(),
        loadTodaysRoutes(),
      ])
    } finally {
      loading.value = false
    }
  })
</script>

<style scoped>
.terminal-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.terminal-card:hover {
  transform: translateY(-2px);
}
</style>
