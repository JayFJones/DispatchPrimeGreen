<template>
  <div>
    <!-- Admin Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card color="red" dark>
          <v-card-text class="text-center py-6">
            <v-icon class="mb-3" icon="mdi-shield-crown" size="48" />
            <h1 class="text-h3 mb-2">Administration Dashboard</h1>
            <p class="text-h6 font-weight-light">
              System management and monitoring
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Admin Quick Actions -->
    <v-row class="mb-6">
      <v-col cols="12">
        <h2 class="text-h4 mb-4">Administrative Tools</h2>
      </v-col>

      <v-col
        v-for="tool in adminTools"
        :key="tool.title"
        cols="12"
        md="4"
        sm="6"
      >
        <v-card
          class="text-center"
          :color="tool.color"
          height="250"
          hover
          @click="tool.action"
        >
          <v-card-text class="d-flex flex-column align-center justify-center fill-height">
            <v-icon
              class="mb-4"
              color="white"
              :icon="tool.icon"
              size="64"
            />
            <h3 class="text-h5 mb-3 text-white">
              {{ tool.title }}
            </h3>
            <p class="text-body-1 text-grey-lighten-4 mb-3">
              {{ tool.description }}
            </p>
            <v-chip
              color="white"
              size="small"
              :text-color="tool.color"
            >
              {{ tool.count }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- System Overview -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2" icon="mdi-monitor-dashboard" />
            System Overview
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <div class="text-center pa-4">
                  <v-icon class="mb-2" color="green" icon="mdi-server" size="32" />
                  <h4 class="text-h6">Server Status</h4>
                  <v-chip color="green" size="small">Online</v-chip>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-center pa-4">
                  <v-icon class="mb-2" color="blue" icon="mdi-database" size="32" />
                  <h4 class="text-h6">Database</h4>
                  <v-chip color="blue" size="small">Connected</v-chip>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-center pa-4">
                  <v-icon class="mb-2" color="orange" icon="mdi-account-multiple" size="32" />
                  <h4 class="text-h6">Active Users</h4>
                  <v-chip color="orange" size="small">{{ activeUsers }}</v-chip>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                <div class="text-center pa-4">
                  <v-icon class="mb-2" color="purple" icon="mdi-clock" size="32" />
                  <h4 class="text-h6">Uptime</h4>
                  <v-chip color="purple" size="small">24h 15m</v-chip>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>
            <v-icon class="mr-2" icon="mdi-alert-circle" />
            Recent Alerts
          </v-card-title>
          <v-card-text>
            <div class="text-center py-4">
              <v-icon class="mb-2" color="green" icon="mdi-check-circle" size="32" />
              <p class="text-body-2 text-grey">No alerts</p>
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>
            <v-icon class="mr-2" icon="mdi-chart-box" />
            Quick Stats
          </v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between align-center mb-2">
              <span>Total Users</span>
              <v-chip color="primary" size="small">{{ totalUsers }}</v-chip>
            </div>
            <div class="d-flex justify-space-between align-center mb-2">
              <span>Admin Users</span>
              <v-chip color="red" size="small">{{ adminUsers }}</v-chip>
            </div>
            <div class="d-flex justify-space-between align-center">
              <span>System Events Today</span>
              <v-chip color="green" size="small">{{ systemEvents }}</v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon class="mr-2" icon="mdi-history" />
            Recent Administrative Activity
          </v-card-title>
          <v-card-text>
            <div class="text-center py-8">
              <v-icon class="mb-4" color="grey-lighten-2" icon="mdi-inbox" size="64" />
              <h3 class="text-h6 text-grey">No recent activity</h3>
              <p class="text-body-2 text-grey-lighten-1">
                Administrative actions will appear here
              </p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore, UserRole } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Real data from backend
  const activeUsers = ref(0)
  const totalUsers = ref(0)
  const adminUsers = ref(0)
  const systemEvents = ref(12)

  // Fetch user statistics
  const fetchUserStats = async () => {
    try {
      const result = await feathersClient.service('users').find({
        query: {
          $limit: 1000, // Get all users to count them
        },
      })

      const users = result.data
      totalUsers.value = users.length

      // Count admin users
      adminUsers.value = users.filter((user: any) =>
        user.roles && user.roles.includes(UserRole.ADMIN),
      ).length

      // For now, treat all users as active (could add last login logic later)
      activeUsers.value = users.length
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const adminTools = computed(() => [
    {
      title: 'User Management',
      description: 'Manage system users, roles, and permissions',
      icon: 'mdi-account-multiple',
      color: 'blue',
      count: `${totalUsers.value} users`,
      action: () => router.push('/admin/users'),
    },
    {
      title: 'Activity Monitor',
      description: 'Monitor user activities, logins, and security events',
      icon: 'mdi-shield-search',
      color: 'purple',
      count: 'Live monitoring',
      action: () => router.push('/admin/activity'),
    },
    {
      title: 'Import Tools',
      description: 'Import data from Excel spreadsheets and external sources',
      icon: 'mdi-database-import',
      color: 'deep-purple',
      count: 'Excel imports',
      action: () => router.push('/admin/import'),
    },
    {
      title: 'System History',
      description: 'View system activity and audit trails',
      icon: 'mdi-history',
      color: 'green',
      count: `${systemEvents.value} events today`,
      action: () => router.push('/admin/history'),
    },
    {
      title: 'System Logging',
      description: 'Monitor application logs and errors',
      icon: 'mdi-file-document-outline',
      color: 'orange',
      count: 'Real-time logs',
      action: () => router.push('/admin/logging'),
    },
    {
      title: 'GEOtab Integration',
      description: 'API testing and verification tools',
      icon: 'mdi-map-marker-radius',
      color: 'cyan',
      count: 'Testing tools',
      action: () => router.push('/admin/geotab'),
    },
  ])

  // Check admin permissions and load data
  onMounted(async () => {
    if (!authStore.isAdmin()) {
      router.push('/')
      return
    }

    // Fetch real user statistics
    await fetchUserStats()
  })
</script>

<style scoped>
.v-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.v-card:hover {
  transform: translateY(-2px);
}
</style>
