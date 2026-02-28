<template>
  <v-card class="timeline-stop-card" elevation="2">
    <v-card-text class="pa-3">
      <!-- Notes Counter and Add Button (only for non-terminal stops) -->
      <div v-if="!stop.isTerminal" class="d-flex align-center justify-space-between mb-2">
        <!-- Notes Counter -->
        <v-badge
          :color="notes.length > 0 ? 'info' : 'grey'"
          :content="notes.length"
          :model-value="notes.length > 0"
          offset-x="1"
          offset-y="1"
          size="x-small"
        >
          <v-icon
            :color="notes.length > 0 ? 'info' : 'grey'"
            size="20"
            style="cursor: pointer;"
            @click="$emit('showNotes', stop._id)"
          >
            mdi-note-text
          </v-icon>
        </v-badge>

        <!-- Add Note Button -->
        <v-btn
          color="primary"
          icon="mdi-note-plus"
          size="small"
          variant="text"
          @click="$emit('addNote', stop._id)"
        />
      </div>
      
      <!-- Terminal stops get a spacer div to maintain consistent layout -->
      <div v-else class="mb-2" style="height: 32px;"></div>

      <div class="text-body-2 mb-1">
        {{ stop.custName || 'Unknown Customer' }}
      </div>
      <div class="text-caption text-grey mb-2">
        {{ stop.address }}<br>
        {{ stop.city }}, {{ stop.state }} {{ stop.zipCode }}
      </div>

      <!-- Distance/Duration and ETA/ETD below the line -->
      <div class="mt-2 pt-2" style="border-top: 1px solid #e0e0e0;">
        <div class="d-flex align-center justify-space-between text-caption">
          <!-- Left side: Distance and Duration info (stacked) -->
          <div v-if="stop.segmentDistanceFormatted && stop.segmentDistanceFormatted !== 'N/A'">
            <div class="d-flex align-center text-primary mb-1">
              <v-icon class="mr-1" size="small">mdi-map-marker-distance</v-icon>
              <span>{{ stop.segmentDistanceFormatted }} mi</span>
            </div>
            <div class="d-flex align-center text-primary">
              <v-icon class="mr-1" size="small">mdi-clock</v-icon>
              <span>{{ stop.segmentDurationFormatted }}</span>
            </div>
          </div>
          <div v-else-if="showDebug">
            <!-- Debug: show what values we have -->
            <div class="text-caption text-grey">
              Debug: {{ stop.segmentDistanceFormatted || 'undefined' }} / {{ stop.segmentDurationFormatted || 'undefined' }}
            </div>
          </div>

          <!-- Right side: ETA and ETD (stacked) -->
          <div class="text-right">
            <div v-if="!stop.isStart" class="d-flex align-center justify-end mb-1">
              <v-icon class="mr-1" size="small">mdi-clock-time-four</v-icon>
              <span>
                <strong>ETA:</strong> {{ convertFloatToTime(stop.eta) || '--' }}
              </span>
            </div>
            <div v-if="!stop.isEnd" class="d-flex align-center justify-end">
              <v-icon class="mr-1" size="small">mdi-clock-time-eight</v-icon>
              <span>
                <strong>ETD:</strong> {{ convertFloatToTime(stop.etd) || '--' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  interface Props {
    stop: any
    notes?: any[]
    showDebug?: boolean
  }

  interface Emits {
    (e: 'showNotes', stopId: string): void
    (e: 'addNote', stopId: string): void
  }

  const props = withDefaults(defineProps<Props>(), {
    notes: () => [],
    showDebug: false
  })

  defineEmits<Emits>()

  // Time conversion utility (same as in route details page)
  const convertFloatToTime = (timeValue: any): string => {
    if (!timeValue && timeValue !== 0) return ''

    try {
      // Handle string values that might contain time formats already
      if (typeof timeValue === 'string') {
        // If it already looks like a time (contains :), return as is
        if (timeValue.includes(':')) {
          return timeValue
        }
        // Try to parse as float
        const floatValue = Number.parseFloat(timeValue)
        if (isNaN(floatValue)) return timeValue
        timeValue = floatValue
      }

      // Convert float to time (assuming decimal hours format like 14.5 = 2:30 PM)
      if (typeof timeValue === 'number') {
        const hours = Math.floor(timeValue)
        const minutes = Math.round((timeValue - hours) * 60)

        // Ensure valid time range
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return timeValue.toString()
        }

        // Format as 24-hour time
        const formattedHours = hours.toString().padStart(2, '0')
        const formattedMinutes = minutes.toString().padStart(2, '0')
        return `${formattedHours}:${formattedMinutes}`
      }

      return timeValue.toString()
    } catch {
      return timeValue?.toString() || ''
    }
  }
</script>

<style scoped>
.timeline-stop-card {
  max-width: 280px;
  min-width: 240px;
  transition: all 0.3s ease;
}

.timeline-stop-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15) !important;
}

/* Responsive adjustments for timeline cards */
@media (max-width: 960px) {
  .timeline-stop-card {
    max-width: 220px;
    min-width: 200px;
  }
}

@media (max-width: 600px) {
  .timeline-stop-card {
    max-width: 180px;
    min-width: 160px;
  }

  .timeline-stop-card .v-card-text {
    padding: 12px !important;
  }
}
</style>