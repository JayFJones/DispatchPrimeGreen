<template>
  <v-card class="mb-4" :style="{ position: 'relative' }">
    <!-- Debugging overlay for routesRequiringUpdate computation -->
    <v-overlay
      v-if="showDebugOverlay"
      v-model="routesRequiringUpdateLoading"
      class="align-center justify-center"
      contained
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="32"
      />
      <div class="ml-3 text-caption">Computing missing routes...</div>
    </v-overlay>
    
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2" color="warning" icon="mdi-alert-circle" />
        Routes Missing Assignments
        <v-chip
          v-if="routesRequiringUpdate.length > 0"
          class="ml-2"
          color="warning"
          size="small"
        >
          {{ routesRequiringUpdate.length }}
        </v-chip>
      </div>
      <v-btn
        :icon="showRoutesRequiringUpdate ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="small"
        variant="text"
        @click="showRoutesRequiringUpdate = !showRoutesRequiringUpdate"
      />
    </v-card-title>

    <v-expand-transition>
      <div v-show="showRoutesRequiringUpdate">
        <v-divider />
        <v-card-text v-if="routesRequiringUpdate.length === 0" class="text-center py-8">
          <v-icon class="mb-2" color="success" icon="mdi-check-circle" size="48" />
          <p class="text-success font-weight-medium">All routes have complete assignments</p>
          <p class="text-caption text-grey">No missing driver or truck assignments found</p>
        </v-card-text>

        <v-data-table
          v-else
          density="compact"
          :headers="updateRequiredHeaders"
          hide-default-footer
          :items="routesRequiringUpdate"
          :items-per-page="-1"
        >
          <!-- Route column -->
          <template #item.route="{ item }">
            <div class="d-flex align-center">
              <v-chip color="primary" size="small" variant="outlined">
                {{ item.route }}
              </v-chip>
            </div>
          </template>

          <!-- Missing Assignments column -->
          <template #item.missingAssignments="{ item }">
            <div class="d-flex flex-column ga-1">
              <!-- Missing Driver chips - First row -->
              <div v-if="item.missingDriverDates.length > 0" class="d-flex flex-wrap ga-1">
                <v-tooltip 
                  v-for="date in item.missingDriverDates"
                  :key="`driver-${date}`"
                  location="top"
                >
                  <template #activator="{ props }">
                    <v-chip
                      v-bind="props"
                      color="warning"
                      size="x-small"
                      variant="outlined"
                      class="d-flex align-center cursor-pointer hover-chip"
                      @click.stop="$emit('selectDriverFromMissingAssignments', item.routeId, date)"
                    >
                      <v-icon class="mr-1" icon="mdi-account" size="12" />
                      {{ formatMissingDate(date) }}
                    </v-chip>
                  </template>
                  <span>Click to assign driver for {{ item.route }} on {{ formatMissingDate(date) }}</span>
                </v-tooltip>
              </div>
              <!-- Missing Truck chips - Second row -->
              <div v-if="item.missingTruckDates.length > 0" class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="date in item.missingTruckDates"
                  :key="`truck-${date}`"
                  color="error"
                  size="x-small"
                  variant="outlined"
                  class="d-flex align-center"
                >
                  <v-icon class="mr-1" icon="mdi-truck" size="12" />
                  {{ formatMissingDate(date) }}
                </v-chip>
              </div>
            </div>
          </template>
        </v-data-table>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
  // Props
  interface Props {
    routesRequiringUpdate: any[]
    routesRequiringUpdateLoading?: boolean
    showDebugOverlay?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    routesRequiringUpdateLoading: false,
    showDebugOverlay: false,
  })

  // Emits
  const emit = defineEmits<{
    selectDriverFromMissingAssignments: [routeId: string, date: string]
  }>()

  // Local state
  const showRoutesRequiringUpdate = ref<boolean>(true)

  // Table headers for routes requiring update
  const updateRequiredHeaders = [
    { title: 'Route', key: 'route', sortable: true, width: '120px' },
    { title: 'Missing Assignments', key: 'missingAssignments', sortable: false, width: '600px' },
  ]

  // Format missing date for display
  const formatMissingDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }
</script>

<style scoped>
  .hover-chip:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }
</style>