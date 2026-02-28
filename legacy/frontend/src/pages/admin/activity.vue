<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card color="purple" dark>
          <v-card-text class="text-center py-4">
            <v-icon class="mb-2" icon="mdi-shield-search" size="40" />
            <h1 class="text-h4 mb-1">User Activity Monitor</h1>
            <p class="text-subtitle-1">
              Monitor all user activities, logins, and security events
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Activity Statistics -->
    <v-row class="mb-6">
      <v-col cols="12" md="3" sm="6">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="green" icon="mdi-login" size="32" />
            <h3 class="text-h6">{{ stats.logins }}</h3>
            <p class="text-caption">Successful Logins</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3" sm="6">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="red" icon="mdi-shield-alert" size="32" />
            <h3 class="text-h6">{{ stats.failedLogins }}</h3>
            <p class="text-caption">Failed Attempts</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3" sm="6">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="orange" icon="mdi-logout" size="32" />
            <h3 class="text-h6">{{ stats.logouts }}</h3>
            <p class="text-caption">Logouts</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3" sm="6">
        <v-card>
          <v-card-text class="text-center">
            <v-icon class="mb-2" color="blue" icon="mdi-clock" size="32" />
            <h3 class="text-h6">{{ stats.last24h }}</h3>
            <p class="text-caption">Last 24 Hours</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Controls -->
    <v-card class="mb-6">
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-filter" />
        Activity Filters
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              density="compact"
              hide-details
              label="Search activities..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="activityFilter"
              clearable
              density="compact"
              hide-details
              :items="activityFilterOptions"
              label="Activity Type"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="timeFilter"
              density="compact"
              hide-details
              :items="timeFilterOptions"
              label="Time Range"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn
              class="mt-1"
              icon="mdi-refresh"
              :loading="loading"
              variant="outlined"
              @click="refreshActivities"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Activity Table -->
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-history" />
        Activity Log
        <v-spacer />
        <v-chip
          v-if="filteredActivities.length > 0"
          color="primary"
          size="small"
          variant="outlined"
        >
          {{ filteredActivities.length }} events
        </v-chip>
      </v-card-title>

      <v-data-table
        class="elevation-0"
        density="compact"
        :headers="headers"
        item-key="id"
        :items="filteredActivities"
        :items-per-page="25"
        :loading="loading"
        :search="search"
      >
        <template #item.type="{ item }">
          <v-chip
            :color="getActivityTypeColor(item.type)"
            size="small"
            variant="flat"
          >
            <v-icon class="mr-1" :icon="getActivityTypeIcon(item.type)" />
            {{ formatActivityType(item.type) }}
          </v-chip>
        </template>

        <template #item.user="{ item }">
          <div v-if="item.userId">
            <strong>{{ item.userName || 'Unknown User' }}</strong>
            <br>
            <span class="text-caption text-grey">{{ item.userEmail || 'No email' }}</span>
          </div>
          <div v-else class="text-red">
            <strong>{{ item.attemptedEmail || 'Unknown' }}</strong>
            <br>
            <span class="text-caption">Failed attempt</span>
          </div>
        </template>

        <template #item.timestamp="{ item }">
          <div>
            {{ formatActivityDate(item.timestamp) }}
            <br>
            <span class="text-caption text-grey">{{ formatActivityTime(item.timestamp) }}</span>
          </div>
        </template>

        <template #item.ipAddress="{ item }">
          <span class="text-mono">{{ item.ipAddress || 'Unknown' }}</span>
        </template>

        <template #item.acknowledged="{ item }">
          <v-checkbox
            :disabled="item.acknowledged"
            hide-details
            :model-value="item.acknowledged"
            @update:model-value="acknowledgeActivity(item)"
          />
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon class="mb-4" color="grey-lighten-2" icon="mdi-shield-search" size="64" />
            <h3 class="text-h6 text-grey">No activity found</h3>
            <p class="text-body-2 text-grey-lighten-1">
              Try adjusting your filters or time range
            </p>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const search = ref('')
  const activityFilter = ref('')
  const timeFilter = ref('24h')
  const loading = ref(false)
  const activities = ref<ActivityItem[]>([])

  interface ActivityItem {
    id: string
    userId?: string
    userName?: string
    userEmail?: string
    attemptedEmail?: string
    type: string
    description: string
    timestamp: string
    ipAddress?: string
    userAgent?: string
    acknowledged?: boolean
    acknowledgedAt?: string
    metadata?: any
  }

  interface ActivityStats {
    logins: number
    failedLogins: number
    logouts: number
    last24h: number
  }

  const stats = ref<ActivityStats>({
    logins: 0,
    failedLogins: 0,
    logouts: 0,
    last24h: 0,
  })

  // Table headers
  const headers = [
    { title: 'Type', key: 'type', sortable: true, width: '130px' },
    { title: 'User', key: 'user', sortable: false, width: '200px' },
    { title: 'Description', key: 'description', sortable: false },
    { title: 'Time', key: 'timestamp', sortable: true, width: '150px' },
    { title: 'IP Address', key: 'ipAddress', sortable: false, width: '120px' },
    { title: 'Ack', key: 'acknowledged', sortable: false, width: '60px' },
  ]

  // Filter options
  const activityFilterOptions = [
    { title: 'All Activities', value: '' },
    { title: 'Successful Logins', value: 'login' },
    { title: 'Failed Logins', value: 'failed_login' },
    { title: 'Logouts', value: 'logout' },
    { title: 'Profile Updates', value: 'profile_update' },
    { title: 'Password Changes', value: 'password_change' },
  ]

  const timeFilterOptions = [
    { title: 'Last Hour', value: '1h' },
    { title: 'Last 24 Hours', value: '24h' },
    { title: 'Last 7 Days', value: '7d' },
    { title: 'Last 30 Days', value: '30d' },
    { title: 'All Time', value: 'all' },
  ]

  // Computed filtered activities
  const filteredActivities = computed(() => {
    let filtered = activities.value

    // Filter by activity type
    if (activityFilter.value) {
      filtered = filtered.filter(activity => activity.type === activityFilter.value)
    }

    // Filter by time range
    if (timeFilter.value !== 'all') {
      const now = new Date()
      let cutoff: Date

      switch (timeFilter.value) {
        case '1h': {
          cutoff = new Date(now.getTime() - 60 * 60 * 1000)
          break
        }
        case '24h': {
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        }
        case '7d': {
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        }
        case '30d': {
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        }
        default: {
          cutoff = new Date(0)
        }
      }

      filtered = filtered.filter(activity => new Date(activity.timestamp) >= cutoff)
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })

  // Fetch all user activities (admin only)
  const refreshActivities = async () => {
    loading.value = true
    try {
      // Fetch activities - admins can see all activities including those without userId
      const result = await feathersClient.service('user-activities').find({
        query: {
          $limit: 1000,
          $sort: { createdAt: -1 },
          adminView: true, // Special flag to indicate this is an admin panel query
        },
      })

      // Fetch all users for name lookup
      const usersResult = await feathersClient.service('users').find({
        query: {
          $limit: 1000,
          $select: ['_id', 'firstName', 'lastName', 'email'],
        },
      })

      // Create user lookup map
      const userMap = new Map()
      usersResult.data.forEach((user: any) => {
        userMap.set(user._id, {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
        })
      })

      activities.value = result.data.map((activity: any) => ({
        id: activity._id || activity.id,
        userId: activity.userId,
        userName: activity.userId ? userMap.get(activity.userId)?.name : undefined,
        userEmail: activity.userId ? userMap.get(activity.userId)?.email : undefined,
        attemptedEmail: activity.metadata?.email,
        type: activity.type,
        description: activity.description,
        timestamp: activity.createdAt,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        acknowledged: activity.acknowledged || false,
        acknowledgedAt: activity.acknowledgedAt,
        metadata: activity.metadata,
      }))

      // Calculate statistics
      calculateStats()
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      loading.value = false
    }
  }

  // Calculate activity statistics
  const calculateStats = () => {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    stats.value = {
      logins: activities.value.filter(a => a.type === 'login').length,
      failedLogins: activities.value.filter(a => a.type === 'failed_login').length,
      logouts: activities.value.filter(a => a.type === 'logout').length,
      last24h: activities.value.filter(a => new Date(a.timestamp) >= last24h).length,
    }
  }

  // Acknowledge an activity
  const acknowledgeActivity = async (activity: ActivityItem) => {
    try {
      await feathersClient.service('user-activities').patch(activity.id, {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      })

      // Update local activity
      const index = activities.value.findIndex(a => a.id === activity.id)
      if (index !== -1) {
        activities.value[index].acknowledged = true
        activities.value[index].acknowledgedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error acknowledging activity:', error)
    }
  }

  // Utility functions
  const formatActivityType = (type: string) => {
    const typeMap: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      failed_login: 'Failed Login',
      profile_update: 'Profile Update',
      password_change: 'Password Change',
    }
    return typeMap[type] || type
  }

  const getActivityTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      login: 'green',
      logout: 'orange',
      failed_login: 'red',
      profile_update: 'blue',
      password_change: 'purple',
    }
    return colorMap[type] || 'grey'
  }

  const getActivityTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      login: 'mdi-login',
      logout: 'mdi-logout',
      failed_login: 'mdi-shield-alert',
      profile_update: 'mdi-account-edit',
      password_change: 'mdi-key-change',
    }
    return iconMap[type] || 'mdi-information'
  }

  const formatActivityDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return 'Unknown'
    }
  }

  const formatActivityTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return 'Unknown'
    }
  }

  // Check admin permissions and load activities
  onMounted(async () => {
    if (!authStore.isAdmin()) {
      router.push('/admin')
      return
    }

    await refreshActivities()
  })

  // Auto-refresh every 30 seconds
  onMounted(() => {
    const interval = setInterval(() => {
      if (!loading.value) {
        refreshActivities()
      }
    }, 30_000)

    onUnmounted(() => {
      clearInterval(interval)
    })
  })
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.v-data-table {
  background: transparent;
}

.v-chip {
  font-weight: 500;
}
</style>
