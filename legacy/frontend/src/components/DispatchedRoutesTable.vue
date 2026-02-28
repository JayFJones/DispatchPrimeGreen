<template>
  <v-card class="mb-6">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-calendar-clock" />
        Dispatched Route Executions (Next 30 Days)
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        variant="elevated"
        @click="$emit('openRoutePlanning')"
      >
        Dispatch Route
      </v-btn>
    </v-card-title>

    <v-data-table
      class="dispatched-routes-table"
      :headers="headers"
      item-value="_id"
      :items="dispatchedRoutes"
      :loading="loading"
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
        <v-chip
          :color="getStatusColor(item.status)"
          size="small"
          variant="outlined"
        >
          {{ getStatusText(item.status) }}
        </v-chip>
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
        <div v-else class="text-grey">
          <v-icon class="mr-1" size="small">mdi-account-plus</v-icon>
          Not assigned
        </div>
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
        <div v-else class="text-grey">
          <v-icon class="mr-1" size="small">mdi-truck-plus</v-icon>
          Not assigned
        </div>
      </template>

      <!-- Times column -->
      <template #item.times="{ item }">
        <div class="text-caption">
          <div v-if="item.plannedDepartureTime">
            <strong>Planned:</strong> {{ item.plannedDepartureTime }}
          </div>
          <div v-if="item.actualDepartureTime" class="text-success">
            <strong>Actual:</strong> {{ item.actualDepartureTime }}
          </div>
        </div>
      </template>

      <!-- Priority column -->
      <template #item.priority="{ item }">
        <v-chip
          v-if="item.priority && item.priority !== 'normal'"
          :color="getPriorityColor(item.priority)"
          size="x-small"
          variant="elevated"
        >
          {{ item.priority.toUpperCase() }}
        </v-chip>
        <span v-else class="text-grey">Normal</span>
      </template>

      <!-- Notes column -->
      <template #item.notes="{ item }">
        <div v-if="item.dispatchNotes || item.operationalNotes" class="text-caption">
          <div v-if="item.dispatchNotes" class="text-truncate" style="max-width: 150px;">
            <strong>Dispatch:</strong> {{ item.dispatchNotes }}
          </div>
          <div v-if="item.operationalNotes" class="text-truncate" style="max-width: 150px;">
            <strong>Ops:</strong> {{ item.operationalNotes }}
          </div>
        </div>
        <span v-else class="text-grey">—</span>
      </template>

      <!-- Actions column -->
      <template #item.actions="{ item }">
        <v-btn
          color="primary"
          icon="mdi-pencil"
          size="small"
          variant="text"
          @click="$emit('editDispatchedRoute', item)"
        />
        <v-btn
          color="error"
          icon="mdi-delete"
          size="small"
          variant="text"
          @click="$emit('deleteDispatchedRoute', item)"
        />
      </template>

      <!-- No data slot -->
      <template #no-data>
        <div class="text-center py-8">
          <v-icon class="mb-2" color="grey" icon="mdi-calendar-remove" size="48" />
          <p class="text-grey">No dispatched route executions found for the next 30 days</p>
          <v-btn
            color="primary"
            variant="outlined"
            @click="$emit('openRoutePlanning')"
          >
            Dispatch First Route
          </v-btn>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
  interface DispatchedRoute {
    _id: string
    routeId: string
    executionDate: string
    terminalId?: string
    assignedDriverId?: string
    assignedTruckId?: string
    assignedSubUnitId?: string
    status: string
    plannedDepartureTime?: string
    actualDepartureTime?: string
    estimatedReturnTime?: string
    actualReturnTime?: string
    dispatchNotes?: string
    operationalNotes?: string
    priority?: string
    estimatedDelayMinutes?: number
    lastLocationUpdate?: string
    createdAt?: string
    updatedAt?: string
  }

  interface Props {
    routeId: string
    dispatchedRoutes: DispatchedRoute[]
    drivers: Map<string, any>
    equipment: Map<string, any>
    loading?: boolean
  }

  defineProps<Props>()

  defineEmits<{
    openRoutePlanning: []
    editDispatchedRoute: [dispatchedRoute: DispatchedRoute]
    deleteDispatchedRoute: [dispatchedRoute: DispatchedRoute]
  }>()

  const headers = [
    { title: 'Date', key: 'executionDate', sortable: true },
    { title: 'Status', key: 'status', sortable: true },
    { title: 'Driver', key: 'driver', sortable: false },
    { title: 'Equipment', key: 'equipment', sortable: false },
    { title: 'Times', key: 'times', sortable: false },
    { title: 'Priority', key: 'priority', sortable: true },
    { title: 'Notes', key: 'notes', sortable: false },
    { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
  ]

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'planned': { return 'blue'
      }
      case 'assigned': { return 'purple'
      }
      case 'dispatched': { return 'orange'
      }
      case 'in-transit': { return 'amber'
      }
      case 'completed': { return 'green'
      }
      case 'cancelled': { return 'red'
      }
      case 'delayed': { return 'deep-orange'
      }
      default: { return 'grey'
      }
    }
  }

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'in-transit': { return 'In Transit'
      }
      default: { return status.charAt(0).toUpperCase() + status.slice(1)
      }
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': { return 'orange'
      }
      case 'urgent': { return 'red'
      }
      default: { return 'grey'
      }
    }
  }
</script>

<style scoped>
.dispatched-routes-table :deep(.v-data-table__tr:hover) {
  background-color: rgba(25, 118, 210, 0.04);
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
