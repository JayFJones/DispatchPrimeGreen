<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 mb-2">Fleet Management</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage and track your vehicle fleet including locations, odometers, and vehicle types
            </p>
          </div>
          <v-chip
            color="primary"
            size="large"
          >
            {{ fleetVehicles.length }} Total Vehicles
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Quick Stats -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="success" icon="mdi-truck" size="48" />
            <h3 class="text-h5">{{ activeTrucks }}</h3>
            <p class="text-body-2 text-grey">Active Vehicles</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="info" icon="mdi-truck-outline" size="48" />
            <h3 class="text-h5">{{ straightTrucks }}</h3>
            <p class="text-body-2 text-grey">Straight Trucks</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="warning" icon="mdi-truck-trailer" size="48" />
            <h3 class="text-h5">{{ tractorTrailers }}</h3>
            <p class="text-body-2 text-grey">Tractor Trailers</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="error" icon="mdi-wrench" size="48" />
            <h3 class="text-h5">{{ inMaintenance }}</h3>
            <p class="text-body-2 text-grey">In Maintenance</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="searchQuery"
          append-inner-icon="mdi-magnify"
          clearable
          hide-details
          label="Search vehicles..."
          placeholder="Search by truck ID, VIN, terminal, or status"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="groupFilter"
          clearable
          hide-details
          :items="groupOptions"
          label="Filter by Group"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="statusFilter"
          clearable
          hide-details
          :items="statusOptions"
          label="Filter by Status"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="typeFilter"
          clearable
          hide-details
          :items="typeOptions"
          label="Filter by Type"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- Fleet Table -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-truck-fast" />
        Fleet Vehicles
        <v-spacer />
        <div class="d-flex gap-2">
          <v-btn
            color="secondary"
            :loading="syncingOdometers"
            prepend-icon="mdi-sync"
            variant="outlined"
            @click="syncFleetOdometers"
          >
            Sync Odometers
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showAddVehicleDialog = true"
          >
            Add Vehicle
          </v-btn>
        </div>
      </v-card-title>

      <v-data-table
        class="clickable-rows"
        :headers="headers"
        item-value="_id"
        :items="filteredFleetVehicles"
        :loading="loading"
        @click:row="handleRowClick"
      >
        <!-- Truck ID column -->
        <template #item.truckID="{ item }">
          <v-chip
            color="primary"
            size="small"
            variant="outlined"
          >
            {{ item.truckID }}
          </v-chip>
        </template>

        <!-- Groups column -->
        <template #item.groups="{ item }">
          <div v-if="item.groups && item.groups.length > 0" class="d-flex flex-wrap gap-1">
            <v-chip
              v-for="(groupName, index) in item.groups"
              :key="index"
              color="primary"
              size="small"
              variant="outlined"
            >
              {{ groupName }}
            </v-chip>
          </div>
          <span v-else class="text-grey">No groups</span>
        </template>

        <!-- Vehicle Type column -->
        <template #item.vehicleType="{ item }">
          <v-chip
            :color="item.vehicleType === 'TT' ? 'deep-purple' : 'teal'"
            size="small"
          >
            <v-icon class="mr-1" :icon="item.vehicleType === 'TT' ? 'mdi-truck-trailer' : 'mdi-truck'" size="small" />
            {{ item.vehicleType === 'TT' ? 'Tractor Trailer' : 'Straight Truck' }}
          </v-chip>
        </template>

        <!-- Status column -->
        <template #item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
            variant="outlined"
          >
            {{ getStatusText(item.status) }}
          </v-chip>
        </template>

        <!-- VIN column -->
        <template #item.vin="{ item }">
          <span v-if="item.vin" class="font-mono">{{ item.vin }}</span>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Odometer column -->
        <template #item.odometer="{ item }">
          <div v-if="item.odometer" class="d-flex align-center">
            <v-icon class="mr-1" icon="mdi-counter" size="small" />
            {{ item.odometer.toLocaleString() }} mi
          </div>
          <span v-else class="text-grey">-</span>
        </template>

        <!-- Location column -->
        <template #item.location="{ item }">
          <div v-if="item.lastLocationLatitude && item.lastLocationLongitude" class="d-flex align-center">
            <v-icon class="mr-1" icon="mdi-map-marker" size="small" />
            <span class="font-mono text-caption">
              {{ item.lastLocationLatitude.toFixed(4) }}, {{ item.lastLocationLongitude.toFixed(4) }}
            </span>
            <v-tooltip activator="parent" location="top">
              Last updated: {{ formatDate(item.lastLocationUpdated) }}
            </v-tooltip>
          </div>
          <span v-else class="text-grey">No location data</span>
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              color="primary"
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click.stop="editVehicle(item)"
            >
              <v-icon>mdi-pencil</v-icon>
              <v-tooltip activator="parent" location="top">
                Edit Vehicle
              </v-tooltip>
            </v-btn>
            <v-btn
              color="secondary"
              icon="mdi-map"
              size="small"
              variant="text"
              @click.stop="viewLocation(item)"
            >
              <v-icon>mdi-map</v-icon>
              <v-tooltip activator="parent" location="top">
                View Location
              </v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add Vehicle Dialog -->
    <v-dialog v-model="showAddVehicleDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" icon="mdi-truck-plus" />
          Add New Vehicle
        </v-card-title>
        <v-form ref="addVehicleForm" v-model="addVehicleFormValid">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newVehicle.truckID"
                  label="Truck ID"
                  :rules="[v => !!v || 'Truck ID is required']"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newVehicle.vehicleType"
                  :items="[{ title: 'Straight Truck', value: 'ST' }, { title: 'Tractor Trailer', value: 'TT' }]"
                  label="Vehicle Type"
                  :rules="[v => !!v || 'Vehicle type is required']"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="newVehicle.terminalId"
                  clearable
                  :items="terminalOptions"
                  label="Terminal"
                  placeholder="Select a terminal (optional)"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newVehicle.vin"
                  label="VIN"
                  placeholder="Vehicle Identification Number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="newVehicle.odometer"
                  label="Odometer"
                  suffix="miles"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="newVehicle.status"
                  :items="statusOptions"
                  label="Status"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newVehicle.notes"
                  label="Notes"
                  rows="3"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="grey"
              variant="text"
              @click="showAddVehicleDialog = false"
            >
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!addVehicleFormValid"
              variant="flat"
              @click="addVehicle"
            >
              Add Vehicle
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>

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

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const loading = ref(true)
  const fleetVehicles = ref<any[]>([])
  const terminals = ref<any[]>([])
  const searchQuery = ref('')
  const statusFilter = ref(null)
  const typeFilter = ref(null)
  const groupFilter = ref(null)
  const showAddVehicleDialog = ref(false)
  const addVehicleFormValid = ref(false)
  const syncingOdometers = ref(false)

  // New vehicle form data
  const newVehicle = ref({
    truckID: '',
    terminalId: null,
    vehicleType: 'ST',
    vin: '',
    odometer: null,
    status: 'active',
    notes: ''
  })

  // Table headers
  const headers = [
    { title: 'Truck ID', key: 'truckID', sortable: true },
    { title: 'Groups', key: 'groups', sortable: false },
    { title: 'Type', key: 'vehicleType', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'VIN', key: 'vin', sortable: true },
    { title: 'Odometer', key: 'odometer', sortable: true },
    { title: 'Last Location', key: 'location', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false, width: '120px' },
  ]

  // Filter options
  const statusOptions = [
    { title: 'Active', value: 'active' },
    { title: 'Inactive', value: 'inactive' },
    { title: 'Maintenance', value: 'maintenance' },
    { title: 'Out of Service', value: 'out-of-service' }
  ]

  const typeOptions = [
    { title: 'Straight Truck', value: 'ST' },
    { title: 'Tractor Trailer', value: 'TT' }
  ]

  // Group options for filtering - gets unique groups from terminals
  const groupOptions = computed(() => {
    const uniqueGroups = new Set<string>()
    for (const terminal of terminals.value) {
      if (terminal?.group) {
        uniqueGroups.add(terminal.group)
      }
    }
    return Array.from(uniqueGroups).sort().map(group => ({ title: group, value: group }))
  })

  // Computed properties for stats
  const activeTrucks = computed(() => fleetVehicles.value.filter(v => v.status === 'active').length)
  const straightTrucks = computed(() => fleetVehicles.value.filter(v => v.vehicleType === 'ST').length)
  const tractorTrailers = computed(() => fleetVehicles.value.filter(v => v.vehicleType === 'TT').length)
  const inMaintenance = computed(() => fleetVehicles.value.filter(v => v.status === 'maintenance').length)

  // Filtered vehicles
  const filteredFleetVehicles = computed(() => {
    let filtered = fleetVehicles.value

    if (statusFilter.value) {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter.value)
    }

    if (typeFilter.value) {
      filtered = filtered.filter(vehicle => vehicle.vehicleType === typeFilter.value)
    }

    if (groupFilter.value) {
      filtered = filtered.filter(vehicle => 
        vehicle.groups && vehicle.groups.includes(groupFilter.value)
      )
    }

    if (searchQuery.value && searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase()
      filtered = filtered.filter(vehicle => {
        const truckIDMatch = vehicle.truckID?.toLowerCase().includes(query)
        const vinMatch = vehicle.vin?.toLowerCase().includes(query)
        const statusMatch = vehicle.status?.toLowerCase().includes(query)
        const groupsMatch = vehicle.groups?.some((group: string) => group.toLowerCase().includes(query))
        return truckIDMatch || vinMatch || statusMatch || groupsMatch
      })
    }

    return filtered
  })

  // Methods
  const loadFleetVehicles = async () => {
    try {
      loading.value = true

      // Load all records with pagination
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

      // Load fleet vehicles and terminals
      const [fleetData, terminalsData] = await Promise.all([
        getAllRecords(feathersClient.service('fleet')),
        getAllRecords(feathersClient.service('terminals'))
      ])

      terminals.value = terminalsData

      // Create terminal lookup map
      const terminalMap = new Map()
      terminalsData.forEach((terminal: any) => {
        terminalMap.set(terminal._id.toString(), terminal)
      })

      // Enhance fleet vehicles with terminal data
      fleetVehicles.value = fleetData.map((vehicle: any) => ({
        ...vehicle,
        terminal: vehicle.terminalId ? terminalMap.get(vehicle.terminalId.toString()) : null
      }))
    } catch (error) {
      console.error('Error loading fleet vehicles:', error)
    } finally {
      loading.value = false
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'grey'
      case 'maintenance': return 'warning'
      case 'out-of-service': return 'error'
      default: return 'grey'
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active': return 'Active'
      case 'inactive': return 'Inactive'
      case 'maintenance': return 'Maintenance'
      case 'out-of-service': return 'Out of Service'
      default: return status
    }
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleRowClick = (event: any, row: any) => {
    viewVehicle(row.item)
  }

  const viewVehicle = (vehicle: any) => {
    router.push(`/fleet/${vehicle._id}`)
  }

  const editVehicle = (vehicle: any) => {
    // TODO: Implement edit vehicle dialog
    console.log('Edit vehicle:', vehicle)
  }

  const viewLocation = (vehicle: any) => {
    if (vehicle.lastLocationLatitude && vehicle.lastLocationLongitude) {
      // TODO: Open map view with vehicle location
      console.log('View location for:', vehicle.truckID, vehicle.lastLocationLatitude, vehicle.lastLocationLongitude)
    }
  }

  const addVehicle = async () => {
    try {
      const vehicleData = {
        truckID: newVehicle.value.truckID,
        terminalId: newVehicle.value.terminalId || undefined,
        vehicleType: newVehicle.value.vehicleType,
        vin: newVehicle.value.vin || undefined,
        odometer: newVehicle.value.odometer || undefined,
        status: newVehicle.value.status,
        notes: newVehicle.value.notes || undefined
      }

      await feathersClient.service('fleet').create(vehicleData)
      
      // Reload fleet vehicles
      await loadFleetVehicles()
      
      // Reset form
      newVehicle.value = {
        truckID: '',
        terminalId: null,
        vehicleType: 'ST',
        vin: '',
        odometer: null,
        status: 'active',
        notes: ''
      }
      
      showAddVehicleDialog.value = false
    } catch (error) {
      console.error('Error adding vehicle:', error)
    }
  }

  // Geotab sync functionality
  const syncFleetOdometers = async () => {
    try {
      syncingOdometers.value = true
      
      // Check if Geotab is already authenticated via the header component
      // We'll need to get the current auth status from the header component
      const geotabHeaderStatus = await checkGeotabAuthStatus()
      
      let authData
      if (geotabHeaderStatus && geotabHeaderStatus.isAuthenticated && geotabHeaderStatus.sessionId) {
        // Validate session data before using
        const hasValidSession = geotabHeaderStatus.sessionId && 
                               geotabHeaderStatus.server && 
                               !geotabHeaderStatus.server.includes('thisserver') &&
                               geotabHeaderStatus.server.startsWith('https://')
        
        if (hasValidSession) {
          // Use existing session data
          authData = {
            database: geotabHeaderStatus.database,
            username: geotabHeaderStatus.username,
            sessionId: geotabHeaderStatus.sessionId,
            server: geotabHeaderStatus.server
          }
          console.log('Using existing Geotab session for sync:', {
            database: authData.database,
            username: authData.username,
            hasSessionId: !!authData.sessionId,
            server: authData.server
          })
        } else if (geotabHeaderStatus && geotabHeaderStatus.password) {
          // Use stored password from authentication
          authData = {
            database: geotabHeaderStatus.database,
            username: geotabHeaderStatus.username,
            password: geotabHeaderStatus.password
          }
          console.log('Using stored password for sync (session invalid)')
        } else {
          console.log('No valid session or stored password available')
          // Fall through to password prompt
        }
      }
      
      if (!authData) {
        // Get saved Geotab credentials from localStorage
        const savedUsername = localStorage.getItem('geotab-username')
        if (!savedUsername) {
          alert('Please authenticate with Geotab first using the "G" icon in the header')
          return
        }

        // Prompt for password since we don't store it
        const password = prompt('Enter your Geotab password to sync odometer readings:')
        if (!password) {
          return
        }
        
        authData = {
          database: 'las2018', // Default database
          username: savedUsername,
          password: password
        }
        console.log('Using fresh authentication for sync')
      }

      const result = await (feathersClient.service('geotab') as any).syncFleetOdometers(authData)

      if (result.success && result.syncResults) {
        // Show results
        const successCount = result.syncResults.filter((r: any) => r.success).length
        const totalCount = result.syncResults.length
        
        console.log('Sync results:', result.syncResults)
        alert(`Odometer sync completed!\n${successCount}/${totalCount} vehicles updated successfully.`)
        
        // Reload fleet data to show updated odometers
        await loadFleetVehicles()
      } else {
        console.error('Sync failed with result:', result)
        alert(`Sync failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Fleet odometer sync error:', error)
      alert(`Sync failed: ${error.message || 'Unknown error'}`)
    } finally {
      syncingOdometers.value = false
    }
  }

  // Check current Geotab authentication status from the app
  const checkGeotabAuthStatus = async () => {
    // Get status from the global window object set by AppHeader
    if (typeof window !== 'undefined' && (window as any).getGeotabStatus) {
      const status = (window as any).getGeotabStatus()
      console.log('Retrieved Geotab status from global:', status)
      return status && status.isAuthenticated ? status : null
    }
    return null
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadFleetVehicles()
  })
</script>

<style scoped>
.clickable-rows >>> tbody tr {
  cursor: pointer;
}

.clickable-rows >>> tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>