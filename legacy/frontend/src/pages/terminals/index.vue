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
        <div class="d-flex align-center justify-space-between mb-4">
          <div>
            <h1 class="text-h4 mb-1">Terminals</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage shipping terminals and distribution centers
            </p>
          </div>
          <v-btn
            color="primary"
            icon="mdi-plus"
            @click="showCreateDialog = true"
          >
            Add Terminal
          </v-btn>
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
              icon="mdi-office-building"
              size="32"
            />
            <h3 class="text-h6">Total Terminals</h3>
            <p class="text-h5 font-weight-bold text-primary">{{ terminals.length }}</p>
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
            <h3 class="text-h6">Active Routes</h3>
            <p class="text-h5 font-weight-bold text-green">{{ getActiveRoutesCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              class="mb-2"
              color="blue"
              icon="mdi-earth"
              size="32"
            />
            <h3 class="text-h6">States</h3>
            <p class="text-h5 font-weight-bold text-blue">{{ getUniqueStatesCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              class="mb-2"
              color="orange"
              icon="mdi-tag-multiple"
              size="32"
            />
            <h3 class="text-h6">DCP Codes</h3>
            <p class="text-h5 font-weight-bold text-orange">{{ getUniqueDCPsCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          append-inner-icon="mdi-magnify"
          clearable
          label="Search terminals..."
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="stateFilter"
          clearable
          :items="stateOptions"
          label="Filter by State"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="dcpFilter"
          clearable
          :items="dcpOptions"
          label="Filter by DCP"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- Terminals Table -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-office-building" />
        Terminals ({{ filteredTerminals.length }})
      </v-card-title>

      <v-data-table
        :headers="headers"
        hide-default-footer
        item-value="_id"
        :items="filteredTerminals"
        :items-per-page="-1"
        :loading="loading"
        @click:row="goToTerminal"
      >
        <!-- Terminal Name column -->
        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <v-avatar
              class="mr-3"
              color="primary"
              size="32"
            >
              <span class="text-white font-weight-bold">
                {{ getTerminalInitials(item.name) }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey-darken-1">{{ item.dcp || 'No DCP' }}</div>
            </div>
          </div>
        </template>

        <!-- Location column -->
        <template #item.location="{ item }">
          <div>
            <div>{{ item.city }}, {{ item.state }}</div>
            <div class="text-caption text-grey-darken-1">{{ item.fullName || 'N/A' }}</div>
          </div>
        </template>

        <!-- Group column -->
        <template #item.group="{ item }">
          <div>
            <v-chip
              v-if="item.group"
              :color="item.terminalType === 'terminal' ? 'primary' : 'secondary'"
              size="small"
            >
              <v-icon start>
                {{ item.terminalType === 'terminal' ? 'mdi-office-building' : 'mdi-warehouse' }}
              </v-icon>
              {{ item.group }}
            </v-chip>
            <span v-else class="text-grey-darken-1">
              <v-icon>mdi-warehouse</v-icon>
              Hub
            </span>
          </div>
        </template>

        <!-- Routes count column -->
        <template #item.routesCount="{ item }">
          <v-chip
            :color="getRoutesCount(item._id) > 0 ? 'green' : 'grey'"
            size="small"
          >
            {{ getRoutesCount(item._id) }} routes
          </v-chip>
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              color="primary"
              icon="mdi-calendar-clock"
              size="small"
              variant="text"
              @click.stop="goToTerminalPlanning(item)"
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
              @click.stop="goToTerminal(null, { item })"
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

    <!-- Create Terminal Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600">
      <v-card>
        <v-card-title>Add New Terminal</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            This feature will be available soon. Terminals are currently managed through data import.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCreateDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  const terminals = ref<any[]>([])
  const routes = ref<any[]>([])
  const search = ref('')
  const stateFilter = ref('')
  const dcpFilter = ref('')
  const showCreateDialog = ref(false)

  // Table headers
  const headers = [
    { title: 'Terminal', key: 'name', sortable: true },
    { title: 'Location', key: 'location', sortable: false },
    { title: 'Group', key: 'group', sortable: true },
    { title: 'Routes', key: 'routesCount', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
  ]

  // Computed
  const filteredTerminals = computed(() => {
    let filtered = terminals.value

    // Search filter
    if (search.value) {
      const searchLower = search.value.toLowerCase()
      filtered = filtered.filter(terminal =>
        terminal.name?.toLowerCase().includes(searchLower)
        || terminal.city?.toLowerCase().includes(searchLower)
        || terminal.state?.toLowerCase().includes(searchLower)
        || terminal.dcp?.toLowerCase().includes(searchLower),
      )
    }

    // State filter
    if (stateFilter.value) {
      filtered = filtered.filter(terminal => terminal.state === stateFilter.value)
    }

    // DCP filter
    if (dcpFilter.value) {
      filtered = filtered.filter(terminal => terminal.dcp === dcpFilter.value)
    }

    return filtered
  })

  const stateOptions = computed(() => {
    const states = [...new Set(terminals.value.map(t => t.state).filter(Boolean))]
    return states.sort()
  })

  const dcpOptions = computed(() => {
    const dcps = [...new Set(terminals.value.map(t => t.dcp).filter(Boolean))]
    return dcps.sort()
  })

  // Methods
  const loadTerminals = async () => {
    try {
      loading.value = true

      // Get all terminals
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

      const [terminalsData, routesData] = await Promise.all([
        getAllRecords(feathersClient.service('terminals')),
        getAllRecords(feathersClient.service('routes')),
      ])

      // Filter out hubs and terminals without groups
      terminals.value = terminalsData
        .filter(terminal => 
          terminal.terminalType !== 'hub' && // Not a hub
          terminal.group && terminal.group.trim() !== '' // Has a group assigned
        )
        .sort((a, b) => a.name?.localeCompare(b.name) || 0)
      routes.value = routesData
    } catch (error) {
      console.error('Error loading terminals:', error)
      terminals.value = []
      routes.value = []
    } finally {
      loading.value = false
    }
  }

  const getTerminalInitials = (name: string): string => {
    if (!name) return '?'
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
  }

  const getRoutesCount = (terminalId: string): number => {
    return routes.value.filter(route => route.terminalId === terminalId).length
  }

  const getActiveRoutesCount = (): number => {
    return routes.value.length
  }

  const getUniqueStatesCount = (): number => {
    return new Set(terminals.value.map(t => t.state).filter(Boolean)).size
  }

  const getUniqueDCPsCount = (): number => {
    return new Set(terminals.value.map(t => t.dcp).filter(Boolean)).size
  }

  const goToTerminal = (event: any, { item }: { item: any }) => {
    if (item?.name) {
      const urlId = terminalToUrlId(item)
      router.push(`/terminals/${urlId}`)
    }
  }

  const goToTerminalPlanning = (terminal: any) => {
    if (terminal?.name) {
      const urlId = terminalToUrlId(terminal)
      router.push(`/planning/${urlId}`)
    }
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    // Check for DCP filter in query parameters
    const route = useRoute()
    if (route.query.dcp) {
      dcpFilter.value = route.query.dcp as string
    }

    loadTerminals()
  })
</script>

<style scoped>
.v-data-table tbody tr {
  cursor: pointer;
}

.v-data-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
