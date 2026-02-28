<template>
  <!-- Availability Dialog -->
  <v-dialog v-model="showDialog" max-width="600">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-calendar-check" />
        Manage Availability - {{ driver?.firstName }} {{ driver?.lastName }}
      </v-card-title>
      <v-card-text>
        <v-form ref="availabilityForm" @submit.prevent="saveAvailability">
          <v-row class="mb-4">
            <v-col cols="6">
              <v-text-field
                v-model="availabilityStartDate"
                label="Start Date"
                required
                :rules="[
                  v => !!v || 'Start date is required',
                  v => !availabilityEndDate || !v || new Date(v) <= new Date(availabilityEndDate) || 'Start date must be on or before end date'
                ]"
                type="date"
                variant="outlined"
                @input="validateDates"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="availabilityEndDate"
                label="End Date"
                required
                :rules="[
                  v => !!v || 'End date is required',
                  v => !availabilityStartDate || !v || new Date(v) >= new Date(availabilityStartDate) || 'End date must be on or after start date'
                ]"
                type="date"
                variant="outlined"
                @input="validateDates"
              />
            </v-col>
          </v-row>

          <v-select
            v-model="availabilityType"
            class="mb-4"
            :items="availabilityTypes"
            label="Availability Type"
            variant="outlined"
          />

          <v-textarea
            v-model="availabilityNotes"
            label="Notes"
            placeholder="Additional details about availability..."
            rows="5"
            variant="outlined"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          @click="saveAvailability"
        >
          Save
        </v-btn>
        <v-btn @click="closeDialog">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()

  // Props
  const props = defineProps<{
    driver: any
    modelValue: boolean
  }>()

  // Emits
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'saved': []
  }>()

  // Reactive data
  const availabilityStartDate = ref('')
  const availabilityEndDate = ref('')
  const availabilityType = ref('Not Available')
  const availabilityNotes = ref('')
  const availabilityForm = ref<any>(null)

  const availabilityTypes = [
    'Not Available',
    'Limited Availability',
    'Medical',
    'Training',
    'Other',
    'Fully Available',
  ]

  // Computed
  const showDialog = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  // Methods
  const validateDates = () => {
    // Trigger form validation when date values change
    if (availabilityForm.value) {
      availabilityForm.value.validate()
    }
  }

  const saveAvailability = async () => {
    if (!props.driver || !authStore.user) return

    // Validate the form
    if (availabilityForm.value) {
      const { valid } = await availabilityForm.value.validate()
      if (!valid) {
        return
      }
    }

    try {
      // Create availability history record
      await feathersClient.service('history').create({
        historyType: 'availability',
        entityType: 'driver',
        entityId: props.driver._id,
        timestamp: new Date().toISOString(),
        userId: authStore.user._id,
        summary: `Availability updated: ${availabilityType.value}${
          availabilityStartDate.value && availabilityEndDate.value
            ? ` from ${availabilityStartDate.value} to ${availabilityEndDate.value}`
            : ''
        }`,
        data: {
          startDate: availabilityStartDate.value,
          endDate: availabilityEndDate.value,
          availabilityType: availabilityType.value,
          originalNotes: availabilityNotes.value,
        },
        notes: availabilityNotes.value,
      })

      console.log('Availability saved for', props.driver?.firstName, props.driver?.lastName)
      closeDialog()
      emit('saved')
    } catch (error) {
      console.error('Error saving availability:', error)
    }
  }

  const closeDialog = () => {
    showDialog.value = false
    availabilityStartDate.value = ''
    availabilityEndDate.value = ''
    availabilityType.value = 'Not Available'
    availabilityNotes.value = ''
  }

  // Reset form when dialog opens
  watch(() => props.modelValue, newValue => {
    if (newValue) {
      availabilityStartDate.value = ''
      availabilityEndDate.value = ''
      availabilityType.value = 'Not Available'
      availabilityNotes.value = ''
    }
  })
</script>
