<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card color="green" dark>
          <v-card-text class="text-center py-4">
            <v-icon class="mb-2" icon="mdi-history" size="40" />
            <h1 class="text-h4 mb-1">System History</h1>
            <p class="text-subtitle-1">
              View system activity and audit trails
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Controls -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          hide-details
          label="Search history..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-select
          v-model="eventTypeFilter"
          hide-details
          :items="eventTypeOptions"
          label="Event type"
          variant="outlined"
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-select
          v-model="dateRange"
          hide-details
          :items="dateRangeOptions"
          label="Date range"
          variant="outlined"
        />
      </v-col>

      <v-col class="d-flex align-center" cols="12" md="2">
        <v-btn
          icon="mdi-refresh"
          :loading="loading"
          variant="outlined"
          @click="refreshHistory"
        />
      </v-col>
    </v-row>

    <!-- History Content -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-timeline" />
        Activity Timeline
      </v-card-title>

      <v-card-text>
        <div class="text-center py-8">
          <v-icon class="mb-4" color="grey-lighten-2" icon="mdi-clock-outline" size="64" />
          <h3 class="text-h6 text-grey">System History Coming Soon</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-4">
            This feature will track all system activities including:
          </p>

          <v-row class="mt-6">
            <v-col cols="12" md="3" sm="6">
              <div class="text-center">
                <v-icon class="mb-2" color="blue" icon="mdi-account" size="24" />
                <h4 class="text-subtitle-1">User Actions</h4>
                <p class="text-caption">Login, logout, failed logins, profile changes</p>
              </div>
            </v-col>
            <v-col cols="12" md="3" sm="6">
              <div class="text-center">
                <v-icon class="mb-2" color="red" icon="mdi-shield-account" size="24" />
                <h4 class="text-subtitle-1">Admin Actions</h4>
                <p class="text-caption">User management, system config</p>
              </div>
            </v-col>
            <v-col cols="12" md="3" sm="6">
              <div class="text-center">
                <v-icon class="mb-2" color="green" icon="mdi-truck" size="24" />
                <h4 class="text-subtitle-1">Dispatch Events</h4>
                <p class="text-caption">Route assignments, status updates</p>
              </div>
            </v-col>
            <v-col cols="12" md="3" sm="6">
              <div class="text-center">
                <v-icon class="mb-2" color="orange" icon="mdi-database" size="24" />
                <h4 class="text-subtitle-1">System Events</h4>
                <p class="text-caption">Database changes, errors</p>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const search = ref('')
  const eventTypeFilter = ref('')
  const dateRange = ref('today')
  const loading = ref(false)

  // Filter options
  const eventTypeOptions = [
    { title: 'All Events', value: '' },
    { title: 'User Actions', value: 'user' },
    { title: 'Admin Actions', value: 'admin' },
    { title: 'Dispatch Events', value: 'dispatch' },
    { title: 'System Events', value: 'system' },
  ]

  const dateRangeOptions = [
    { title: 'Today', value: 'today' },
    { title: 'This Week', value: 'week' },
    { title: 'This Month', value: 'month' },
    { title: 'Last 3 Months', value: '3months' },
    { title: 'All Time', value: 'all' },
  ]

  // Methods
  const refreshHistory = () => {
    loading.value = true
    // TODO: Implement history fetching
    setTimeout(() => {
      loading.value = false
    }, 1000)
  }

  // Check admin permissions
  onMounted(() => {
    if (!authStore.isAdmin()) {
      router.push('/')
    }
  })
</script>
