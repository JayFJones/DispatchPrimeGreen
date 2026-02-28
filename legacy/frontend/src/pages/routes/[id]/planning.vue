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

    <!-- Route not found -->
    <v-alert
      v-if="!loading && !route"
      color="error"
      icon="mdi-alert-circle"
      title="Route Not Found"
      type="error"
    >
      The requested route could not be found.
      <template #append>
        <v-btn
          color="white"
          variant="outlined"
          @click="router.push('/routes')"
        >
          Back to Routes
        </v-btn>
      </template>
    </v-alert>

    <!-- Main content -->
    <div v-if="!loading && route">
      <!-- Page Header -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center mb-4">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="router.push(`/routes/${routeNameParam}`)"
            />
            <div class="ml-3">
              <h1 class="text-h4 mb-1">Route Planning - {{ route.trkid }}</h1>
              <p class="text-body-1 text-grey-darken-1">
                Plan and schedule executions for this route
              </p>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Route Summary Card -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" icon="mdi-map-marker-path" />
              Route Summary
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="3">
                  <div class="text-center">
                    <v-icon class="mb-2" color="primary" icon="mdi-map-marker-path" size="32" />
                    <h3 class="text-h6">Route ID</h3>
                    <p class="text-h5 font-weight-bold text-primary">{{ route.trkid }}</p>
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-center">
                    <v-icon class="mb-2" color="blue" icon="mdi-office-building" size="32" />
                    <h3 class="text-h6">Terminal</h3>
                    <p class="text-h6 font-weight-bold">{{ terminal?.name || 'Unknown' }}</p>
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-center">
                    <v-icon class="mb-2" color="green" icon="mdi-map-marker-multiple" size="32" />
                    <h3 class="text-h6">Total Stops</h3>
                    <p class="text-h5 font-weight-bold text-green">{{ route.totalStops || 0 }}</p>
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-center">
                    <v-icon class="mb-2" color="orange" icon="mdi-calendar-clock" size="32" />
                    <h3 class="text-h6">Planned Executions</h3>
                    <p class="text-h5 font-weight-bold text-orange">{{ plannedRoutes.length }}</p>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Planning Controls -->
      <v-row class="mb-6">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="startDate"
            label="Start Date"
            type="date"
            @update:model-value="generateDateRange"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="endDate"
            label="End Date"
            type="date"
            @update:model-value="loadPlannedRoutes"
          />
        </v-col>
        <v-col class="d-flex align-center gap-2" cols="12" md="4">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            variant="elevated"
            @click="createPlannedRoute"
          >
            Plan Route
          </v-btn>
          <v-btn
            color="secondary"
            prepend-icon="mdi-calendar-sync"
            variant="outlined"
            @click="bulkPlan"
          >
            Bulk Plan
          </v-btn>
        </v-col>
      </v-row>

      <!-- Planning Table -->
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" icon="mdi-calendar-clock" />
            Planned Route Executions
          </div>
          <v-chip
            :color="plannedRoutes.length > 0 ? 'success' : 'grey'"
            variant="outlined"
          >
            {{ plannedRoutes.length }} planned
          </v-chip>
        </v-card-title>

        <v-data-table
          class="planning-table"
          :headers="headers"
          item-value="_id"
          :items="plannedRoutes"
          :loading="plannedRoutesLoading"
        >
          <!-- Execution Date column -->
          <template #item.executionDate="{ item }">
            <div class="d-flex align-center">
              <v-icon
                class="mr-2"
                :color="getDateColor(item.executionDate)"
                icon="mdi-calendar"
                size="small"
              />
              <span :class="getDateTextClass(item.executionDate)">
                {{ formatDate(item.executionDate) }}
              </span>
            </div>
          </template>

          <!-- Status column -->
          <template #item.status="{ item }">
            <v-select
              density="compact"
              :items="statusOptions"
              :model-value="item.status"
              variant="outlined"
              @update:model-value="updateStatus(item, $event)"
            />
          </template>

          <!-- Driver column -->
          <template #item.driver="{ item }">
            <div v-if="item.assignedDriverId && drivers.get(item.assignedDriverId)">
              <div class="font-weight-medium">
                {{ drivers.get(item.assignedDriverId).firstName }} {{ drivers.get(item.assignedDriverId).lastName }}
              </div>
              <div class="text-caption text-grey-darken-1">
                ID: {{ drivers.get(item.assignedDriverId).driverId }}
              </div>
            </div>
            <v-btn
              v-else
              color="primary"
              size="small"
              variant="outlined"
              @click="assignDriver(item)"
            >
              <v-icon class="mr-1" size="small">mdi-account-plus</v-icon>
              Assign
            </v-btn>
          </template>

          <!-- Equipment column -->
          <template #item.equipment="{ item }">
            <div v-if="item.assignedTruckId || item.assignedSubUnitId">
              <div v-if="item.assignedTruckId && equipment.get(item.assignedTruckId)" class="mb-1">
                <v-chip
                  color="blue"
                  size="x-small"
                  variant="outlined"
                >
                  {{ equipment.get(item.assignedTruckId).equipmentNumber }}
                </v-chip>
              </div>
              <div v-if="item.assignedSubUnitId && equipment.get(item.assignedSubUnitId)">
                <v-chip
                  color="orange"
                  size="x-small"
                  variant="outlined"
                >
                  {{ equipment.get(item.assignedSubUnitId).equipmentNumber }}
                </v-chip>
              </div>
            </div>
            <v-btn
              v-else
              color="primary"
              size="small"
              variant="outlined"
              @click="assignEquipment(item)"
            >
              <v-icon class="mr-1" size="small">mdi-truck-plus</v-icon>
              Assign
            </v-btn>
          </template>

          <!-- Times column -->
          <template #item.times="{ item }">
            <div class="text-caption">
              <div v-if="item.plannedDepartureTime">
                <v-text-field
                  density="compact"
                  :model-value="item.plannedDepartureTime"
                  type="time"
                  variant="outlined"
                  @update:model-value="updateTime(item, 'plannedDepartureTime', $event)"
                />
              </div>
              <div v-else>
                <v-btn
                  color="primary"
                  size="x-small"
                  variant="outlined"
                  @click="setDepartureTime(item)"
                >
                  Set Time
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Priority column -->
          <template #item.priority="{ item }">
            <v-select
              density="compact"
              :items="priorityOptions"
              :model-value="item.priority || 'normal'"
              variant="outlined"
              @update:model-value="updatePriority(item, $event)"
            />
          </template>

          <!-- Actions column -->
          <template #item.actions="{ item }">
            <v-btn
              color="primary"
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="editPlannedRoute(item)"
            />
            <v-btn
              color="error"
              icon="mdi-delete"
              size="small"
              variant="text"
              @click="deletePlannedRoute(item)"
            />
          </template>

          <!-- No data slot -->
          <template #no-data>
            <div class="text-center py-8">
              <v-icon class="mb-2" color="grey" icon="mdi-calendar-remove" size="48" />
              <p class="text-grey">No planned route executions found</p>
              <v-btn
                color="primary"
                variant="outlined"
                @click="createPlannedRoute"
              >
                Plan First Route
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialogVisible" max-width="600px">
      <v-card>
        <v-card-title>
          {{ isEditing ? 'Edit' : 'Create' }} Planned Route
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.executionDate"
                  label="Execution Date"
                  required
                  :rules="[v => !!v || 'Date is required']"
                  type="date"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.plannedDepartureTime"
                  label="Departure Time"
                  type="time"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.status"
                  :items="statusOptions"
                  label="Status"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.priority"
                  :items="priorityOptions"
                  label="Priority"
                />
              </v-col>

              <v-col cols="12">
                <v-textarea
                  v-model="formData.dispatchNotes"
                  label="Dispatch Notes"
                  rows="3"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="dialogVisible = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formValid"
            variant="elevated"
            @click="savePlannedRoute"
          >
            {{ isEditing ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()
  const currentRoute = useRoute()

  // Get route ID from URL
  // Get route name from URL (URL-safe format)
  const routeNameParam = currentRoute.params.id as string
  
  // Convert URL-safe format back to route name (replace dashes with dots)
  const routeName = routeNameParam.replace(/-/g, '.')

  // Reactive data
  const loading = ref(true)
  const plannedRoutesLoading = ref(false)
  const dialogVisible = ref(false)
  const isEditing = ref(false)
  const formValid = ref(false)
  const formRef = ref()

  const route = ref<any>(null)
  const terminal = ref<any>(null)
  const plannedRoutes = ref<any[]>([])
  const drivers = ref<Map<string, any>>(new Map())
  const equipment = ref<Map<string, any>>(new Map())

  // Date range for planning
  const startDate = ref<string>(new Date().toISOString().split('T')[0])
  const endDate = ref<string>(((): string => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split('T')[0]
  })())

  // Form data
  const formData = ref({
    routeId: route.value?._id,
    executionDate: '',
    plannedDepartureTime: '',
    status: 'planned',
    priority: 'normal',
    dispatchNotes: '',
  })

  // Table headers
  const headers = [
    { title: 'Date', key: 'executionDate', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Driver', key: 'driver', sortable: false },
    { title: 'Equipment', key: 'equipment', sortable: false },
    { title: 'Times', key: 'times', sortable: false },
    { title: 'Priority', key: 'priority', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
  ]

  // Options
  const statusOptions = [
    { title: 'Planned', value: 'planned' },
    { title: 'Assigned', value: 'assigned' },
    { title: 'Dispatched', value: 'dispatched' },
    { title: 'In Transit', value: 'in-transit' },
    { title: 'Completed', value: 'completed' },
    { title: 'Cancelled', value: 'cancelled' },
    { title: 'Delayed', value: 'delayed' },
  ]

  const priorityOptions = [
    { title: 'Normal', value: 'normal' },
    { title: 'High', value: 'high' },
    { title: 'Urgent', value: 'urgent' },
  ]

  // Methods
  const loadRouteDetails = async () => {
    try {
      loading.value = true

      // Load route details by trkid
      const routeQuery = await feathersClient.service('routes').find({
        query: {
          trkid: routeName,
          $limit: 1
        }
      })
      
      // Check if route was found
      const routes = Array.isArray(routeQuery) ? routeQuery : routeQuery.data || []
      if (routes.length === 0) {
        console.error(`Route not found with trkid: ${routeName}`)
        route.value = null
        return
      }
      
      const routeResponse = routes[0]
      route.value = routeResponse

      // Load terminal if associated
      if (routeResponse.terminalId) {
        const terminalResponse = await feathersClient.service('terminals').get(routeResponse.terminalId)
        terminal.value = terminalResponse
      }

      // Load planned routes
      await loadPlannedRoutes()
    } catch (error) {
      console.error('Error loading route details:', error)
      route.value = null
    } finally {
      loading.value = false
    }
  }

  const loadPlannedRoutes = async () => {
    try {
      plannedRoutesLoading.value = true

      const response = await feathersClient.service('dispatched-routes').find({
        query: {
          routeId: route.value?._id,
          executionDate: {
            $gte: startDate.value,
            $lte: endDate.value,
          },
          $sort: { executionDate: 1 },
        },
      })

      plannedRoutes.value = response.data || []

      // Load related driver and equipment data
      await loadRelatedData()
    } catch (error) {
      console.error('Error loading planned routes:', error)
      plannedRoutes.value = []
    } finally {
      plannedRoutesLoading.value = false
    }
  }

  const loadRelatedData = async () => {
    try {
      const driverIds = new Set<string>()
      const equipmentIds = new Set<string>()

      for (const route of plannedRoutes.value) {
        if (route.assignedDriverId) driverIds.add(route.assignedDriverId)
        if (route.assignedTruckId) equipmentIds.add(route.assignedTruckId)
        if (route.assignedSubUnitId) equipmentIds.add(route.assignedSubUnitId)
      }

      // Load drivers
      if (driverIds.size > 0) {
        const driversResponse = await feathersClient.service('drivers').find({
          query: { _id: { $in: Array.from(driverIds) }, $limit: driverIds.size },
        })

        const driversMap = new Map()
        driversResponse.data.forEach((driver: any) => {
          driversMap.set(driver._id, driver)
        })
        drivers.value = driversMap
      }

      // Load equipment
      if (equipmentIds.size > 0) {
        const equipmentResponse = await feathersClient.service('equipment').find({
          query: { _id: { $in: Array.from(equipmentIds) }, $limit: equipmentIds.size },
        })

        const equipmentMap = new Map()
        equipmentResponse.data.forEach((equip: any) => {
          equipmentMap.set(equip._id, equip)
        })
        equipment.value = equipmentMap
      }
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  // Helper methods
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A'

    try {
      const date = new Date(dateString)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      const isToday = date.toDateString() === today.toDateString()
      const isTomorrow = date.toDateString() === tomorrow.toDateString()

      if (isToday) return 'Today'
      if (isTomorrow) return 'Tomorrow'

      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const getDateColor = (dateString: string): string => {
    if (!dateString) return 'grey'

    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'error' // Past
    if (diffDays === 0) return 'warning' // Today
    if (diffDays === 1) return 'info' // Tomorrow
    return 'success' // Future
  }

  const getDateTextClass = (dateString: string): string => {
    if (!dateString) return 'text-grey'

    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'text-error' // Past
    if (diffDays === 0) return 'text-warning font-weight-bold' // Today
    if (diffDays === 1) return 'text-info font-weight-bold' // Tomorrow
    return ''
  }

  const generateDateRange = () => {
    if (startDate.value) {
      const start = new Date(startDate.value)
      const end = new Date(start)
      end.setDate(start.getDate() + 30)
      endDate.value = end.toISOString().split('T')[0]
      loadPlannedRoutes()
    }
  }

  // Event handlers
  const createPlannedRoute = () => {
    isEditing.value = false
    formData.value = {
      routeId: route.value?._id,
      executionDate: new Date().toISOString().split('T')[0],
      plannedDepartureTime: '',
      status: 'planned',
      priority: 'normal',
      dispatchNotes: '',
    }
    dialogVisible.value = true
  }

  const editPlannedRoute = (plannedRoute: any) => {
    isEditing.value = true
    formData.value = { ...plannedRoute }
    dialogVisible.value = true
  }

  const savePlannedRoute = async () => {
    try {
      await (isEditing.value ? feathersClient.service('dispatched-routes').patch((formData.value as any)._id, formData.value) : feathersClient.service('dispatched-routes').create(formData.value))

      dialogVisible.value = false
      await loadPlannedRoutes()
    } catch (error) {
      console.error('Error saving planned route:', error)
    }
  }

  const deletePlannedRoute = async (plannedRoute: any) => {
    try {
      await feathersClient.service('dispatched-routes').remove(plannedRoute._id)
      await loadPlannedRoutes()
    } catch (error) {
      console.error('Error deleting planned route:', error)
    }
  }

  const updateStatus = async (plannedRoute: any, newStatus: string) => {
    try {
      await feathersClient.service('dispatched-routes').patch(plannedRoute._id, { status: newStatus })
      plannedRoute.status = newStatus
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const updateTime = async (plannedRoute: any, field: string, newTime: string) => {
    try {
      const updateData = { [field]: newTime }
      await feathersClient.service('dispatched-routes').patch(plannedRoute._id, updateData)
      plannedRoute[field] = newTime
    } catch (error) {
      console.error('Error updating time:', error)
    }
  }

  const updatePriority = async (plannedRoute: any, newPriority: string) => {
    try {
      await feathersClient.service('dispatched-routes').patch(plannedRoute._id, { priority: newPriority })
      plannedRoute.priority = newPriority
    } catch (error) {
      console.error('Error updating priority:', error)
    }
  }

  const setDepartureTime = (plannedRoute: any) => {
    const defaultTime = '08:00'
    updateTime(plannedRoute, 'plannedDepartureTime', defaultTime)
  }

  const assignDriver = (plannedRoute: any) => {
    // TODO: Open driver assignment dialog
    console.log('Assign driver to:', plannedRoute)
  }

  const assignEquipment = (plannedRoute: any) => {
    // TODO: Open equipment assignment dialog
    console.log('Assign equipment to:', plannedRoute)
  }

  const bulkPlan = () => {
    // TODO: Open bulk planning dialog
    console.log('Bulk plan routes')
  }

  // Lifecycle
  onMounted(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
      return
    }

    loadRouteDetails()
  })
</script>

<style scoped>
.planning-table :deep(.v-data-table__tr:hover) {
  background-color: rgba(25, 118, 210, 0.04);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
