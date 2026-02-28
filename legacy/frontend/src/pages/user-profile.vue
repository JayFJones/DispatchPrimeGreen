<template>
  <v-container fluid>
    <div v-if="authStore.isAuthenticated && authStore.user">
      <v-row>
        <!-- Left Pane - User Profile -->
        <v-col cols="12" lg="6">
          <v-card class="pa-6">
            <v-card-title class="text-h4 mb-4">
              <v-icon class="mr-3" icon="mdi-account-circle" />
              User Profile
            </v-card-title>

            <v-divider class="mb-6" />

            <v-row>
              <v-col cols="12" sm="6">
                <v-card class="pa-4 mb-4" variant="outlined">
                  <v-card-subtitle class="text-caption text-medium-emphasis">
                    First Name
                  </v-card-subtitle>
                  <v-card-text class="text-h6 py-2">
                    {{ authStore.user.firstName || 'Not provided' }}
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" sm="6">
                <v-card class="pa-4 mb-4" variant="outlined">
                  <v-card-subtitle class="text-caption text-medium-emphasis">
                    Last Name
                  </v-card-subtitle>
                  <v-card-text class="text-h6 py-2">
                    {{ authStore.user.lastName || 'Not provided' }}
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-card class="pa-4 mb-4" variant="outlined">
              <v-card-subtitle class="text-caption text-medium-emphasis">
                Email Address
              </v-card-subtitle>
              <v-card-text class="text-h6 py-2">
                {{ authStore.user.email }}
              </v-card-text>
            </v-card>

            <v-card class="pa-4 mb-4" variant="outlined">
              <v-card-subtitle class="text-caption text-medium-emphasis">
                User Roles
              </v-card-subtitle>
              <v-card-text class="py-2">
                <v-chip-group>
                  <v-chip
                    v-for="roleName in authStore.getUserRoleNames()"
                    :key="roleName"
                    :color="getRoleColor(roleName)"
                    size="small"
                    variant="flat"
                  >
                    <v-icon
                      class="mr-1"
                      :icon="getRoleIcon(roleName)"
                    />
                    {{ roleName }}
                  </v-chip>
                </v-chip-group>
              </v-card-text>
            </v-card>

            <v-card class="pa-4 mb-4" variant="outlined">
              <v-card-subtitle class="text-caption text-medium-emphasis">
                Home Terminal
              </v-card-subtitle>
              <v-card-text class="py-2">
                <div v-if="homeTerminal" class="d-flex align-center">
                  <v-icon color="primary" class="mr-3">mdi-office-building</v-icon>
                  <div>
                    <div class="text-h6">{{ homeTerminal.name }}</div>
                    <div class="text-body-2 text-grey">
                      {{ homeTerminal.location }}
                      <span v-if="homeTerminal.agent" class="ml-2">({{ homeTerminal.agent }})</span>
                    </div>
                  </div>
                </div>
                <div v-else class="d-flex align-center">
                  <v-icon color="grey" class="mr-3">mdi-office-building-outline</v-icon>
                  <div>
                    <div class="text-body-1 text-grey">No home terminal set</div>
                    <div class="text-body-2 text-grey-lighten-1">
                      Set your home terminal in 
                      <router-link to="/operations-hub" class="text-primary text-decoration-none">Operations Hub</router-link>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <v-card class="pa-4 mb-4" variant="outlined">
              <v-card-subtitle class="text-caption text-medium-emphasis">
                Account Created
              </v-card-subtitle>
              <v-card-text class="text-h6 py-2">
                {{ formatDate(authStore.user.createdAt) }}
              </v-card-text>
            </v-card>

            <v-card class="pa-4 mb-6" variant="outlined">
              <v-card-subtitle class="text-caption text-medium-emphasis">
                Last Updated
              </v-card-subtitle>
              <v-card-text class="text-h6 py-2">
                {{ formatDate(authStore.user.updatedAt) }}
              </v-card-text>
            </v-card>

            <v-divider class="mb-6" />

            <v-row>
              <v-col cols="12">
                <v-btn
                  block
                  color="primary"
                  size="large"
                  variant="outlined"
                  @click="editProfile"
                >
                  <v-icon class="mr-2" icon="mdi-pencil" />
                  Edit Profile
                </v-btn>
              </v-col>
            </v-row>
          </v-card>
        </v-col>

        <!-- Right Pane - Activity History -->
        <v-col cols="12" lg="6">
          <v-card class="pa-6">
            <v-card-title class="text-h4 mb-4 d-flex align-center">
              <v-icon class="mr-3" icon="mdi-history" />
              Activity History
              <v-spacer />
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    icon="mdi-cog"
                    size="small"
                    variant="text"
                    v-bind="props"
                  />
                </template>
                <v-list>
                  <v-list-item
                    @click="showAcknowledged = !showAcknowledged"
                  >
                    <template #prepend>
                      <v-checkbox
                        hide-details
                        :model-value="showAcknowledged"
                        readonly
                      />
                    </template>
                    <v-list-item-title>Show acknowledged events</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-title>

            <v-divider class="mb-6" />

            <!-- Activity Controls -->
            <v-row class="mb-4">
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="activitySearch"
                  density="compact"
                  hide-details
                  label="Search activities..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="activityFilter"
                  density="compact"
                  hide-details
                  :items="activityFilterOptions"
                  label="Filter by type"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <!-- Activity Table -->
            <v-data-table
              class="elevation-1"
              density="compact"
              :headers="activityHeaders"
              item-key="id"
              :items="filteredActivities"
              :items-per-page="10"
              :loading="loadingActivities"
              :search="activitySearch"
            >
              <template #item.type="{ item }">
                <v-chip
                  :color="getActivityTypeColor(item.type)"
                  size="small"
                  variant="flat"
                >
                  <v-icon class="mr-1" :icon="getActivityTypeIcon(item.type)" />
                  {{ item.type }}
                </v-chip>
              </template>

              <template #item.timestamp="{ item }">
                {{ formatActivityDate(item.timestamp) }}
              </template>

              <template #item.ipAddress="{ item }">
                <span class="text-mono">{{ item.ipAddress }}</span>
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
                  <v-icon class="mb-4" color="grey-lighten-2" icon="mdi-history" size="64" />
                  <h3 class="text-h6 text-grey">No activity found</h3>
                  <p class="text-body-2 text-grey-lighten-1">
                    Your account activities will appear here
                  </p>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Not authenticated state -->
    <div v-else class="text-center py-8">
      <v-card class="pa-8 mx-auto" max-width="400">
        <v-icon
          class="text-medium-emphasis mb-4"
          icon="mdi-account-alert"
          size="64"
        />
        <h3 class="text-h6 mb-4">Not Logged In</h3>
        <p class="text-body-1 text-medium-emphasis mb-6">
          Please log in to view your profile information.
        </p>
        <v-btn
          color="primary"
          size="large"
          @click="router.push('/user-auth')"
        >
          Go to Login
        </v-btn>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Home terminal data
  const homeTerminal = ref<any>(null)
  const loadingHomeTerminal = ref(false)

  // Activity tracking data
  const activitySearch = ref('')
  const activityFilter = ref('')
  const loadingActivities = ref(false)
  const activities = ref<ActivityItem[]>([])
  const showAcknowledged = ref(false)

  interface ActivityItem {
    id: string
    type: string
    description: string
    timestamp: string
    ipAddress: string
    userAgent?: string
    acknowledged?: boolean
    acknowledgedAt?: string
  }

  // Activity table headers
  const activityHeaders = [
    { title: 'Type', key: 'type', sortable: true },
    { title: 'Description', key: 'description', sortable: false },
    { title: 'Time', key: 'timestamp', sortable: true },
    { title: 'IP Address', key: 'ipAddress', sortable: false },
    { title: 'Ack', key: 'acknowledged', sortable: false, width: '60px' },
  ]

  // Activity filter options
  const activityFilterOptions = [
    { title: 'All Activities', value: '' },
    { title: 'Login', value: 'login' },
    { title: 'Logout', value: 'logout' },
    { title: 'Failed Login', value: 'failed_login' },
    { title: 'Profile Update', value: 'profile_update' },
    { title: 'Password Change', value: 'password_change' },
  ]

  // Computed filtered activities
  const filteredActivities = computed(() => {
    let filtered = activities.value

    // Filter by type if specified
    if (activityFilter.value) {
      filtered = filtered.filter(activity => activity.type === activityFilter.value)
    }

    // Filter by acknowledged status
    if (!showAcknowledged.value) {
      filtered = filtered.filter(activity => !activity.acknowledged)
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })

  // Load home terminal information from user profile
  const loadHomeTerminal = async () => {
    if (!authStore.user?.homeTerminalId) {
      homeTerminal.value = null
      return
    }
    
    loadingHomeTerminal.value = true
    try {
      // Fetch terminal details from database using home terminal ID from user profile
      const terminal = await feathersClient.service('terminals').get(authStore.user.homeTerminalId)
      homeTerminal.value = {
        id: terminal._id,
        name: terminal.name,
        location: terminal.city && terminal.state ? `${terminal.city}, ${terminal.state}` : (terminal.agent || 'Unknown Location'),
        city: terminal.city,
        state: terminal.state,
        agent: terminal.agent,
        cName: terminal.cName
      }
    } catch (error) {
      console.error('Error loading home terminal:', error)
      // If terminal no longer exists, clear it from user profile
      if (error && (error as any).code === 404) {
        try {
          await feathersClient.service('users').patch(authStore.user._id, {
            homeTerminalId: null
          })
          // Update local auth store
          await authStore.reAuthenticate()
        } catch (updateError) {
          console.error('Error clearing invalid home terminal:', updateError)
        }
      }
      homeTerminal.value = null
    } finally {
      loadingHomeTerminal.value = false
    }
  }

  // Fetch user activities
  const fetchUserActivities = async () => {
    loadingActivities.value = true
    try {
      const result = await feathersClient.service('user-activities').find({
        query: {
          $limit: 50,
          $sort: { createdAt: -1 },
        },
      })

      activities.value = result.data.map((activity: any) => ({
        id: activity._id || activity.id,
        type: activity.type,
        description: activity.description,
        timestamp: activity.createdAt,
        ipAddress: activity.ipAddress || 'Unknown',
        userAgent: activity.userAgent,
        acknowledged: activity.acknowledged || false,
        acknowledgedAt: activity.acknowledgedAt,
      }))
    } catch (error) {
      console.error('Error fetching user activities:', error)
      // Fallback to mock data if API fails
      activities.value = [
        {
          id: '1',
          type: 'login',
          description: 'User logged in',
          timestamp: new Date().toISOString(),
          ipAddress: '192.168.1.100',
        },
      ]
    } finally {
      loadingActivities.value = false
    }
  }

  // Acknowledge an activity
  const acknowledgeActivity = async (activity: ActivityItem) => {
    try {
      await feathersClient.service('user-activities').patch(activity.id, {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      })

      // Update the local activity
      const index = activities.value.findIndex(a => a.id === activity.id)
      if (index !== -1) {
        activities.value[index].acknowledged = true
        activities.value[index].acknowledgedAt = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error acknowledging activity:', error)
    // Could add a toast notification here
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'

    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const formatActivityDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60_000)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 1) return 'Just now'
      if (minutes < 60) return `${minutes}m ago`
      if (hours < 24) return `${hours}h ago`
      if (days < 7) return `${days}d ago`

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
      })
    } catch {
      return 'Unknown'
    }
  }

  const editProfile = () => {
    // TODO: Implement profile editing functionality
    console.log('Edit profile clicked')
  }

  const getRoleColor = (roleName: string) => {
    const colorMap: Record<string, string> = {
      'Administrator': 'red',
      'Operations Manager': 'orange',
      'Terminal Manager': 'amber',
      'Dispatcher': 'green',
      'Driver': 'blue',
      'Dashboard User': 'grey',
    }
    return colorMap[roleName] || 'primary'
  }

  const getRoleIcon = (roleName: string) => {
    const iconMap: Record<string, string> = {
      'Administrator': 'mdi-shield-crown',
      'Operations Manager': 'mdi-account-supervisor',
      'Terminal Manager': 'mdi-office-building',
      'Dispatcher': 'mdi-radio-tower',
      'Driver': 'mdi-truck',
      'Dashboard User': 'mdi-view-dashboard',
    }
    return iconMap[roleName] || 'mdi-account'
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

  // Load activities and home terminal when component mounts
  onMounted(() => {
    if (authStore.isAuthenticated) {
      loadHomeTerminal()
      fetchUserActivities()
    }
  })
  
  // Watch for changes in user data to refresh home terminal
  watch(() => authStore.user?.homeTerminalId, () => {
    if (authStore.isAuthenticated) {
      loadHomeTerminal()
    }
  })

  // Redirect to login if not authenticated
  watchEffect(() => {
    if (!authStore.isAuthenticated) {
      router.push('/user-auth')
    }
  })
</script>

<style scoped>
.v-card-subtitle {
  padding-bottom: 0;
}

.v-card-text {
  padding-top: 0;
}

.text-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>
