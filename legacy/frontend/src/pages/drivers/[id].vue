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

    <!-- Driver not found -->
    <v-alert
      v-if="!loading && !driver"
      color="error"
      icon="mdi-alert-circle"
      title="Driver Not Found"
      type="error"
    >
      The requested driver could not be found.
      <template #append>
        <v-btn
          color="white"
          variant="outlined"
          @click="router.push('/drivers')"
        >
          Back to Drivers
        </v-btn>
      </template>
    </v-alert>

    <!-- Driver details -->
    <div v-if="!loading && driver">
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="router.push('/drivers')"
            />
            <div class="ml-3">
              <h1 class="text-h4 mb-1">{{ driver.firstName }} {{ driver.lastName }}</h1>
              <p class="text-body-1 text-grey-darken-1">
                Driver details and information
              </p>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Driver Overview Cards -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-avatar
                class="mb-2"
                color="indigo"
                size="48"
              >
                <span class="text-white font-weight-bold text-h6">
                  {{ getDriverInitials(driver.firstName, driver.lastName) }}
                </span>
              </v-avatar>
              <h3 class="text-h6">Driver Name</h3>
              <p class="text-h6 font-weight-bold text-primary">{{ driver.firstName }} {{ driver.lastName }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                :color="getStatusColor(driver.status)"
                icon="mdi-account-check"
                size="32"
              />
              <h3 class="text-h6">Status</h3>
              <p class="text-h6 font-weight-bold" :class="`text-${getStatusColor(driver.status)}`">
                {{ driver.status || 'Unknown' }}
              </p>
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
              <h3 class="text-h6">License</h3>
              <p class="text-h6 font-weight-bold text-blue">{{ driver.licenseNumber || 'N/A' }}</p>
              <p class="text-caption text-grey">{{ driver.licenseState || 'No State' }}</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card>
            <v-card-text class="text-center">
              <v-icon
                class="mb-2"
                color="green"
                icon="mdi-account-clock"
                size="32"
              />
              <h3 class="text-h6">Experience</h3>
              <p class="text-h6 font-weight-bold text-green">
                {{ driver.totalYearsExperience ? driver.totalYearsExperience + ' years' : 'N/A' }}
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Main Content Layout -->
      <v-row class="mb-6">
        <!-- Left Column - Driver Information (1/3 width) -->
        <v-col cols="12" md="4">
          <!-- Personal Information -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-account" />
              Personal Information
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>First Name:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.firstName || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Last Name:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.lastName || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Date of Birth:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDate(driver.dob) }}
                </v-col>

                <v-col cols="6">
                  <strong>Primary Phone:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.primaryPhone || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Driver ID:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.driverId || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>GEOtab:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.geotab || 'N/A' }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Employment Information -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-briefcase" />
              Employment Information
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>Status:</strong>
                </v-col>
                <v-col cols="6">
                  <v-chip
                    :color="getStatusColor(driver.status)"
                    size="small"
                  >
                    {{ driver.status || 'Unknown' }}
                  </v-chip>
                </v-col>

                <v-col cols="6">
                  <strong>Driver Status:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.driverStatus || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Hire Date:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDate(driver.hireDate) }}
                </v-col>

                <v-col cols="6">
                  <strong>Termination Date:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDate(driver.terminationDate) }}
                </v-col>

                <v-col cols="6">
                  <strong>Rehire Date:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDate(driver.rehireDate) }}
                </v-col>

                <v-col cols="6">
                  <strong>Worker Classification:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.workerClassification || 'N/A' }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- License Information -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-card-account-details" />
              License Information
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>License Number:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.licenseNumber || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>License State:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.licenseState || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>License Type:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.licenseType || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Drivers License Type:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.driversLicenseType || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>License Exp Date:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDate(driver.licenseExpDate) }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Experience & Operations -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-account-clock" />
              Experience & Operations
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>Total Years Experience:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.totalYearsExperience ? driver.totalYearsExperience + ' years' : 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Driving Experience:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.drivingExperience || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>CDL Driving Experience:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.cdlDrivingExperience || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Worklist:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.worklist || 'N/A' }}
                </v-col>

                <v-col cols="6">
                  <strong>Operating Authority:</strong>
                </v-col>
                <v-col cols="6">
                  {{ driver.operatingAuthority || 'N/A' }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column - Activity & Routes (2/3 width) -->
        <v-col cols="12" md="8">
          <!-- Availability Section -->
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" icon="mdi-calendar-check" />
                Availability History ({{ availabilityHistory.length }})
              </div>
              <v-btn
                color="primary"
                icon="mdi-calendar-plus"
                size="small"
                variant="text"
                @click="showAvailabilityDialog = true"
              />
            </v-card-title>
            <v-card-text>
              <div v-if="availabilityHistory.length === 0" class="text-center py-4">
                <v-icon class="mb-2" color="grey-lighten-2" icon="mdi-calendar-clock" size="48" />
                <h3 class="text-h6 text-grey">No availability records</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  Availability history will appear here when recorded
                </p>
              </div>

              <div v-else>
                <v-data-table
                  density="compact"
                  :headers="availabilityHeaders"
                  hide-default-footer
                  item-value="_id"
                  :items="availabilityHistory"
                >
                  <!-- Status column -->
                  <template #item.status="{ item }">
                    <div class="d-flex align-center">
                      <v-avatar class="mr-2" color="red" size="24">
                        <v-icon color="white" icon="mdi-calendar" size="12" />
                      </v-avatar>
                      <v-chip
                        :color="getAvailabilityColor(item.data?.availabilityType)"
                        size="small"
                        variant="outlined"
                      >
                        {{ item.data?.availabilityType || 'Unknown' }}
                      </v-chip>
                    </div>
                  </template>

                  <!-- Date Range column -->
                  <template #item.dateRange="{ item }">
                    <div v-if="item.data?.startDate && item.data?.endDate">
                      <strong>{{ formatDate(item.data.startDate) }}</strong>
                      <br>
                      <span class="text-caption">to {{ formatDate(item.data.endDate) }}</span>
                    </div>
                    <span v-else class="text-grey">N/A</span>
                  </template>

                  <!-- Notes column -->
                  <template #item.notes="{ item }">
                    <div>
                      <span v-if="item.notes && item.notes.trim()">
                        {{ item.notes }}
                      </span>
                      <span v-else-if="item.data?.originalNotes && item.data.originalNotes.trim()">
                        {{ item.data.originalNotes }}
                      </span>
                      <span v-else class="text-grey font-italic">
                        {{ item.summary }}
                      </span>
                    </div>
                  </template>

                  <!-- Created column -->
                  <template #item.created="{ item }">
                    <span class="text-caption">
                      {{ formatDate(item.timestamp) }}
                    </span>
                  </template>

                  <!-- Actions column -->
                  <template #item.actions="{ item }">
                    <div class="d-flex align-center ga-1">
                      <v-btn
                        color="primary"
                        icon="mdi-pencil"
                        size="small"
                        title="Edit availability"
                        variant="text"
                        @click="editAvailabilityRecord(item)"
                      />
                      <v-btn
                        color="red"
                        icon="mdi-delete"
                        size="small"
                        title="Delete availability"
                        variant="text"
                        @click="confirmDeleteAvailability(item)"
                      />
                    </div>
                  </template>
                </v-data-table>
              </div>
            </v-card-text>
          </v-card>

          <!-- Future Routes Section -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-map-marker-path" />
              Future Routes
            </v-card-title>
            <v-card-text>
              <div class="text-center py-4">
                <v-icon class="mb-2" color="grey-lighten-2" icon="mdi-truck-outline" size="48" />
                <h3 class="text-h6 text-grey">No future routes assigned</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  Upcoming route assignments will appear here
                </p>
              </div>
            </v-card-text>
          </v-card>

          <!-- Route History Section -->
          <v-card class="mb-4">
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-history" />
              Route History
            </v-card-title>
            <v-card-text>
              <div class="text-center py-4">
                <v-icon class="mb-2" color="grey-lighten-2" icon="mdi-clipboard-text-clock" size="48" />
                <h3 class="text-h6 text-grey">No route history</h3>
                <p class="text-body-2 text-grey-lighten-1">
                  Completed route assignments will appear here
                </p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Metadata -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-information" />
              Record Information
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>Created:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDateTime(driver.createdAt) }}
                </v-col>

                <v-col cols="6">
                  <strong>Last Updated:</strong>
                </v-col>
                <v-col cols="6">
                  {{ formatDateTime(driver.updatedAt) }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Availability Dialog Component -->
    <DriverAvailabilityDialog
      v-model="showAvailabilityDialog"
      :driver="driver"
      @saved="onAvailabilitySaved"
    />

    <!-- Edit Availability Dialog Component -->
    <DriverAvailabilityEditDialog
      v-model="showEditAvailabilityDialog"
      :driver="driver"
      :record="editingRecord"
      @saved="onAvailabilityEdited"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmation" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="red" icon="mdi-delete-alert" />
          Delete Availability Record
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-4">
            Are you sure you want to delete this availability record?
          </p>
          <div v-if="recordToDelete" class="pa-3 bg-grey-lighten-4 rounded">
            <div class="d-flex align-center mb-2">
              <v-chip
                :color="getAvailabilityColor(recordToDelete.data?.availabilityType)"
                size="small"
                variant="outlined"
              >
                {{ recordToDelete.data?.availabilityType || 'Unknown' }}
              </v-chip>
            </div>
            <div class="text-body-2 mb-1">
              <strong>Date Range:</strong>
              <span v-if="recordToDelete.data?.startDate && recordToDelete.data?.endDate">
                {{ formatDate(recordToDelete.data.startDate) }} to {{ formatDate(recordToDelete.data.endDate) }}
              </span>
              <span v-else class="text-grey">N/A</span>
            </div>
            <div v-if="recordToDelete.notes || recordToDelete.data?.originalNotes" class="text-body-2">
              <strong>Notes:</strong>
              {{ recordToDelete.notes || recordToDelete.data?.originalNotes }}
            </div>
          </div>
          <v-alert
            class="mt-4"
            color="warning"
            icon="mdi-alert"
            variant="tonal"
          >
            This action cannot be undone.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="cancelDelete">Cancel</v-btn>
          <v-btn
            color="red"
            variant="elevated"
            @click="deleteAvailabilityRecord"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import DriverAvailabilityDialog from '@/components/DriverAvailabilityDialog.vue'
  import DriverAvailabilityEditDialog from '@/components/DriverAvailabilityEditDialog.vue'
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()
  const currentRoute = useRoute()

  // Reactive data
  const loading = ref(true)
  const driverData = ref<any>(null)
  const showAvailabilityDialog = ref(false)
  const showEditAvailabilityDialog = ref(false)
  const editingRecord = ref<any>(null)
  const availabilityHistory = ref<any[]>([])
  const showDeleteConfirmation = ref(false)
  const recordToDelete = ref<any>(null)

  // Get driver ID from URL
  const driverId = currentRoute.params.id as string

  // Computed
  const driver = computed(() => driverData.value)

  // Table headers for availability history
  const availabilityHeaders = [
    { title: 'Status', key: 'status', sortable: false, width: '200px' },
    { title: 'Date Range', key: 'dateRange', sortable: false, width: '150px' },
    { title: 'Notes', key: 'notes', sortable: false },
    { title: 'Created', key: 'created', sortable: false, width: '100px' },
    { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
  ]

  // Methods
  const loadDriverDetails = async () => {
    try {
      loading.value = true

      // Load driver details and availability history in parallel
      const [driverResponse] = await Promise.all([
        feathersClient.service('drivers').get(driverId),
        loadAvailabilityHistory(),
      ])

      driverData.value = driverResponse
    } catch (error) {
      console.error('Error loading driver details:', error)
      driverData.value = null
    } finally {
      loading.value = false
    }
  }

  const loadAvailabilityHistory = async () => {
    try {
      // Load availability history for this driver
      const historyResponse = await feathersClient.service('history').find({
        query: {
          entityType: 'driver',
          entityId: driverId,
          historyType: 'availability',
          $sort: { timestamp: -1 }, // Most recent first
          $limit: 50, // Limit to last 50 records
        },
      })

      const histories = Array.isArray(historyResponse) ? historyResponse : historyResponse.data || []

      // Sort by start date (most future to farthest past)
      availabilityHistory.value = histories.sort((a, b) => {
        const dateA = a.data?.startDate ? new Date(a.data.startDate).getTime() : new Date(a.timestamp).getTime()
        const dateB = b.data?.startDate ? new Date(b.data.startDate).getTime() : new Date(b.timestamp).getTime()
        return dateB - dateA // Descending order (future to past)
      })

      return histories
    } catch (error) {
      console.error('Error loading availability history:', error)
      availabilityHistory.value = []
      return []
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

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A'

    try {
      // Handle various date formats
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString // Return original if parsing fails
      return date.toLocaleDateString()
    } catch {
      return dateString // Return original if any error
    }
  }

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return 'N/A'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    } catch {
      return 'N/A'
    }
  }

  const getAvailabilityColor = (availabilityType: string): string => {
    if (!availabilityType) return 'grey'

    const type = availabilityType.toLowerCase()
    if (type.includes('fully available')) return 'green'
    if (type.includes('not available')) return 'red'
    if (type.includes('limited')) return 'orange'
    if (type.includes('medical')) return 'purple'
    if (type.includes('training')) return 'blue'
    return 'grey'
  }

  const editAvailabilityRecord = (record: any) => {
    editingRecord.value = record
    showEditAvailabilityDialog.value = true
  }

  const onAvailabilitySaved = () => {
    // Refresh availability history when a new record is saved
    loadAvailabilityHistory()
    console.log('Availability saved successfully')
  }

  const onAvailabilityEdited = () => {
    // Refresh availability history when a record is edited
    loadAvailabilityHistory()
    editingRecord.value = null
    console.log('Availability edited successfully')
  }

  const confirmDeleteAvailability = (record: any) => {
    recordToDelete.value = record
    showDeleteConfirmation.value = true
  }

  const cancelDelete = () => {
    showDeleteConfirmation.value = false
    recordToDelete.value = null
  }

  const deleteAvailabilityRecord = async () => {
    if (!recordToDelete.value) return

    try {
      // Delete the history record
      await feathersClient.service('history').remove(recordToDelete.value._id)

      console.log('Availability record deleted successfully')

      // Refresh the availability history
      await loadAvailabilityHistory()

      // Close the dialog and clear the record
      showDeleteConfirmation.value = false
      recordToDelete.value = null
    } catch (error) {
      console.error('Error deleting availability record:', error)
    }
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadDriverDetails()
  })
</script>

<style scoped>
/* Cursor pointer for clickable elements */
.cursor-pointer {
  cursor: pointer;
}
</style>
