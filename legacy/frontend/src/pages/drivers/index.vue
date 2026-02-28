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
            <h1 class="text-h4 mb-1">Drivers</h1>
            <p class="text-body-1 text-grey-darken-1">
              Manage drivers and their license information
            </p>
          </div>
          <v-btn
            color="primary"
            icon="mdi-plus"
            @click="showCreateDialog = true"
          >
            Add Driver
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
              icon="mdi-account-hard-hat"
              size="32"
            />
            <h3 class="text-h6">Total Drivers</h3>
            <p class="text-h5 font-weight-bold text-primary">{{ drivers.length }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              class="mb-2"
              color="green"
              icon="mdi-check-circle"
              size="32"
            />
            <h3 class="text-h6">Active Status</h3>
            <p class="text-h5 font-weight-bold text-green">{{ getActiveDriversCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              class="mb-2"
              color="blue"
              icon="mdi-card-account-details"
              size="32"
            />
            <h3 class="text-h6">CDL Drivers</h3>
            <p class="text-h5 font-weight-bold text-blue">{{ getCDLDriversCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center">
            <v-icon
              class="mb-2"
              color="orange"
              icon="mdi-earth"
              size="32"
            />
            <h3 class="text-h6">States</h3>
            <p class="text-h5 font-weight-bold text-orange">{{ getUniqueStatesCount() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search and Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          append-inner-icon="mdi-magnify"
          clearable
          label="Search drivers..."
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-select
          v-model="statusFilter"
          clearable
          :items="statusOptions"
          label="Filter by Status"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="licenseTypeFilter"
          clearable
          :items="licenseTypeOptions"
          label="Filter by License Type"
          variant="outlined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="stateFilter"
          clearable
          :items="stateOptions"
          label="Filter by License State"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- Drivers Table -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-account-hard-hat" />
        Drivers ({{ filteredDrivers.length }})
      </v-card-title>

      <v-data-table
        :headers="headers"
        item-value="_id"
        :items="filteredDrivers"
        :loading="loading"
        @click:row="goToDriver"
      >
        <!-- Driver Name column -->
        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <v-avatar
              class="mr-3"
              color="indigo"
              size="32"
            >
              <span class="text-white font-weight-bold">
                {{ getDriverInitials(item.firstName, item.lastName) }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.firstName }} {{ item.lastName }}</div>
              <div class="text-caption text-grey-darken-1">{{ item.driverId || 'No ID' }}</div>
            </div>
          </div>
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

        <!-- License Info column -->
        <template #item.license="{ item }">
          <div>
            <div>{{ item.licenseNumber || 'N/A' }}</div>
            <div class="text-caption text-grey-darken-1">{{ item.licenseState || 'N/A' }}</div>
          </div>
        </template>

        <!-- Status column -->
        <template #item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
          >
            {{ item.status || 'Unknown' }}
          </v-chip>
        </template>

        <!-- License Type column -->
        <template #item.licenseType="{ item }">
          <div>
            <div>{{ item.licenseType || 'N/A' }}</div>
            <div v-if="item.driversLicenseType" class="text-caption text-grey-darken-1">
              {{ item.driversLicenseType }}
            </div>
          </div>
        </template>

        <!-- Phone column -->
        <template #item.phone="{ item }">
          <span>{{ item.primaryPhone || 'N/A' }}</span>
        </template>

        <!-- Actions column -->
        <template #item.actions="{ item }">
          <div class="d-flex align-center ga-1">
            <v-btn
              color="primary"
              icon="mdi-eye"
              size="small"
              title="View driver details"
              variant="text"
              @click.stop="goToDriver(null, { item })"
            />
            <v-btn
              v-if="item.primaryPhone"
              color="green"
              icon="mdi-phone"
              size="small"
              :title="`Call ${item.primaryPhone}`"
              variant="text"
              @click.stop="showCallDialog(item)"
            />
            <v-btn
              color="orange"
              icon="mdi-calendar-check"
              size="small"
              title="Manage availability"
              variant="text"
              @click.stop="showAvailabilityDialog(item)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create Driver Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600">
      <v-card>
        <v-card-title>Add New Driver</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            This feature will be available soon. Drivers are currently managed through data import.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCreateDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Call Dialog -->
    <v-dialog v-model="showCallDialogState" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" icon="mdi-phone" />
          Call {{ selectedDriver?.firstName }} {{ selectedDriver?.lastName }} - {{ selectedDriver?.primaryPhone }}
        </v-card-title>
        <v-card-text>
          <v-row class="mb-4">
            <v-col cols="6">
              <v-text-field
                v-model="callDate"
                label="Call Date"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="callTime"
                label="Call Time"
                type="time"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-textarea
            v-model="callNotes"
            label="Call Notes"
            placeholder="Enter notes about this call..."
            rows="4"
            variant="outlined"
          />

          <div class="mt-4">
            <h4 class="text-h6 mb-3">Call Outcome</h4>
            <v-row>
              <v-col cols="12" sm="4">
                <v-checkbox
                  v-model="callOutcome.didNotAnswer"
                  color="orange"
                  label="Did not answer"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-checkbox
                  v-model="callOutcome.leftVoicemail"
                  color="blue"
                  label="Left voicemail"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-checkbox
                  v-model="callOutcome.requestedFutureCall"
                  color="purple"
                  label="Requested future call"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-checkbox
                  v-model="callOutcome.spoke"
                  color="green"
                  label="Spoke with driver"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-checkbox
                  v-model="callOutcome.unavailable"
                  color="red"
                  label="Driver unavailable"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-checkbox
                  v-model="callOutcome.callback"
                  color="indigo"
                  label="Will call back"
                />
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="green"
            prepend-icon="mdi-phone"
            @click="placeCall"
          >
            Place Call
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="outlined"
            @click="saveCallNotes"
          >
            Save Notes
          </v-btn>
          <v-btn @click="closeCallDialog">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Availability Dialog Component -->
    <DriverAvailabilityDialog
      v-model="showAvailabilityDialogState"
      :driver="selectedAvailabilityDriver"
      @saved="onAvailabilitySaved"
    />
  </div>
</template>

<script setup lang="ts">
  import DriverAvailabilityDialog from '@/components/DriverAvailabilityDialog.vue'
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const loading = ref(true)
  const drivers = ref<any[]>([])
  // groupData removed - groups now stored as names directly
  const search = ref('')
  const statusFilter = ref('Hired')
  const licenseTypeFilter = ref('')
  const stateFilter = ref('')
  const showCreateDialog = ref(false)
  const showCallDialogState = ref(false)
  const selectedDriver = ref<any>(null)
  const callNotes = ref('')
  const callDate = ref('')
  const callTime = ref('')
  const callOutcome = ref({
    didNotAnswer: false,
    leftVoicemail: false,
    requestedFutureCall: false,
    spoke: false,
    unavailable: false,
    callback: false,
  })

  // Availability dialog state
  const showAvailabilityDialogState = ref(false)
  const selectedAvailabilityDriver = ref<any>(null)

  // Table headers
  const headers = [
    { title: 'Driver', key: 'name', sortable: true },
    { title: 'Groups', key: 'groups', sortable: false },
    { title: 'License Info', key: 'license', sortable: false },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'License Type', key: 'licenseType', sortable: false },
    { title: 'Phone', key: 'phone', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
  ]

  // Computed
  const filteredDrivers = computed(() => {
    let filtered = drivers.value

    // Search filter
    if (search.value) {
      const searchLower = search.value.toLowerCase()
      filtered = filtered.filter(driver =>
        driver.firstName?.toLowerCase().includes(searchLower)
        || driver.lastName?.toLowerCase().includes(searchLower)
        || driver.licenseNumber?.toLowerCase().includes(searchLower)
        || driver.driverId?.toLowerCase().includes(searchLower)
        || driver.primaryPhone?.toLowerCase().includes(searchLower),
      )
    }

    // Status filter
    if (statusFilter.value) {
      filtered = filtered.filter(driver => {
        const driverStatus = driver.status?.toLowerCase() || ''
        const filterStatus = statusFilter.value.toLowerCase()
        return driverStatus.includes(filterStatus)
      })
    }

    // License type filter
    if (licenseTypeFilter.value) {
      filtered = filtered.filter(driver => driver.licenseType === licenseTypeFilter.value || driver.driversLicenseType === licenseTypeFilter.value)
    }

    // State filter
    if (stateFilter.value) {
      filtered = filtered.filter(driver => driver.licenseState === stateFilter.value)
    }

    return filtered
  })

  const licenseTypeOptions = computed(() => {
    const licenseTypes = [...new Set([
      ...drivers.value.map(d => d.licenseType).filter(Boolean),
      ...drivers.value.map(d => d.driversLicenseType).filter(Boolean),
    ])]
    return licenseTypes.sort()
  })

  const stateOptions = computed(() => {
    const states = [...new Set(drivers.value.map(d => d.licenseState).filter(Boolean))]
    return states.sort()
  })

  const statusOptions = computed(() => {
    const statuses = [...new Set(drivers.value.map(d => d.status).filter(Boolean))]
    return statuses.sort()
  })

  // Methods
  const loadDrivers = async () => {
    try {
      loading.value = true

      // Get all drivers
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

      const driversData = await getAllRecords(feathersClient.service('drivers'))
      
      // Group data loading removed - groups are now stored as names directly in database
      
      drivers.value = driversData.sort((a, b) => {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim()
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim()
        return nameA.localeCompare(nameB)
      })
    } catch (error) {
      console.error('Error loading drivers:', error)
      drivers.value = []
    } finally {
      loading.value = false
    }
  }

  const getDriverInitials = (firstName: string, lastName: string): string => {
    const first = firstName?.[0] || ''
    const last = lastName?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }

  const getStatusColor = (status: string): string => {
    if (!status) return 'grey'

    const statusLower = status.toLowerCase()
    if (statusLower.includes('active') || statusLower.includes('current')) return 'green'
    if (statusLower.includes('inactive') || statusLower.includes('terminated')) return 'red'
    if (statusLower.includes('pending') || statusLower.includes('review')) return 'orange'
    return 'blue'
  }

  const getActiveDriversCount = (): number => {
    return drivers.value.filter(driver => {
      const status = driver.status?.toLowerCase() || ''
      return status.includes('active') || status.includes('current')
    }).length
  }

  const getCDLDriversCount = (): number => {
    return drivers.value.filter(driver => {
      const licenseType = driver.licenseType?.toLowerCase() || ''
      const driverLicenseType = driver.driversLicenseType?.toLowerCase() || ''
      return licenseType.includes('cdl') || driverLicenseType.includes('cdl')
    }).length
  }

  const getUniqueStatesCount = (): number => {
    return new Set(drivers.value.map(d => d.licenseState).filter(Boolean)).size
  }

  // getGroupName function removed - groups now stored as names directly

  const goToDriver = (event: any, { item }: { item: any }) => {
    router.push(`/drivers/${item._id}`)
  }

  const showAvailabilityDialog = (driver: any) => {
    selectedAvailabilityDriver.value = driver
    showAvailabilityDialogState.value = true
  }

  const onAvailabilitySaved = () => {
    // Handle post-save actions here
    console.log('Availability saved successfully')
  }

  const showCallDialog = (driver: any) => {
    selectedDriver.value = driver
    callNotes.value = ''

    // Reset call outcome toggles
    callOutcome.value = {
      didNotAnswer: false,
      leftVoicemail: false,
      requestedFutureCall: false,
      spoke: false,
      unavailable: false,
      callback: false,
    }

    // Pre-fill current date and time
    const now = new Date()
    callDate.value = now.toISOString().split('T')[0] // YYYY-MM-DD format
    callTime.value = now.toTimeString().slice(0, 5) // HH:MM format

    showCallDialogState.value = true
  }

  const placeCall = () => {
    if (selectedDriver.value?.primaryPhone) {
      // Open tel link to place the call
      window.location.href = `tel:${selectedDriver.value.primaryPhone}`
    }
  }

  const saveCallNotes = async () => {
    if (!selectedDriver.value || !authStore.user) return

    try {
      // Build summary based on call outcomes
      let summary = 'Driver contact made'
      const outcomes = Object.entries(callOutcome.value)
        .filter(([_, value]) => value)
        .map(([key, _]) => {
          // Convert camelCase to readable format
          return key.replace(/([A-Z])/g, ' $1').toLowerCase()
        })

      if (outcomes.length > 0) {
        summary += `: ${outcomes.join(', ')}`
      }

      // Create contact history record
      await feathersClient.service('history').create({
        historyType: 'driver_contact',
        entityType: 'driver',
        entityId: selectedDriver.value._id,
        timestamp: new Date().toISOString(),
        userId: authStore.user._id,
        summary,
        data: {
          contactDate: callDate.value,
          contactTime: callTime.value,
          phoneNumber: selectedDriver.value.primaryPhone,
          callOutcome: callOutcome.value,
          originalNotes: callNotes.value,
        },
        notes: callNotes.value,
      })

      console.log('Call notes saved for', selectedDriver.value?.firstName, selectedDriver.value?.lastName)
      showCallDialogState.value = false
      callNotes.value = ''
    } catch (error) {
      console.error('Error saving call notes:', error)
    }
  }

  const closeCallDialog = () => {
    showCallDialogState.value = false
    callNotes.value = ''
    callDate.value = ''
    callTime.value = ''
    callOutcome.value = {
      didNotAnswer: false,
      leftVoicemail: false,
      requestedFutureCall: false,
      spoke: false,
      unavailable: false,
      callback: false,
    }
    selectedDriver.value = null
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadDrivers()
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
