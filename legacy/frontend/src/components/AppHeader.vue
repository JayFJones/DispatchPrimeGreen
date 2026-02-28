<template>
  <v-app-bar
    app
    color="primary"
    dark
    dense
  >
    <v-app-bar-nav-icon
      @click="$emit('toggleSidebar')"
    />

    <v-toolbar-title class="d-flex align-center">
      <v-icon class="mr-2" icon="mdi-truck-delivery" />
      DispatchPrime
    </v-toolbar-title>

    <v-spacer />

    <!-- Dynamic Page Context and Terminal -->
    <div class="text-center">
      <div class="text-h6 font-weight-medium">
        {{ pageContext }}
      </div>
      <div v-if="terminalContext" class="text-caption text-grey-lighten-2">
        {{ terminalContext }}
      </div>
    </div>

    <v-spacer />

    <!-- Quick Navigation Icons -->
    <div v-if="authStore.isAuthenticated" class="d-flex align-center mr-4">
      <v-tooltip location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mr-2"
            color="grey-lighten-3"
            icon
            size="small"
            variant="tonal"
            @click="goToOperationsHub"
          >
            <v-icon color="primary" icon="mdi-monitor-dashboard" />
          </v-btn>
        </template>
        <span>Operations Hub</span>
      </v-tooltip>

      <v-tooltip location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mr-2"
            color="grey-lighten-3"
            icon
            size="small"
            variant="tonal"
            @click="goToTerminals"
          >
            <v-icon color="orange" icon="mdi-office-building" />
          </v-btn>
        </template>
        <span>Terminals</span>
      </v-tooltip>

      <v-tooltip location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mr-2"
            color="grey-lighten-3"
            icon
            size="small"
            variant="tonal"
            @click="goToRoutes"
          >
            <v-icon color="green" icon="mdi-map-marker-path" />
          </v-btn>
        </template>
        <span>Routes</span>
      </v-tooltip>

      <v-tooltip location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mr-2"
            color="grey-lighten-3"
            icon
            size="small"
            variant="tonal"
            @click="goToDrivers"
          >
            <v-icon color="blue" icon="mdi-account-hard-hat" />
          </v-btn>
        </template>
        <span>Drivers</span>
      </v-tooltip>

      <v-tooltip location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            class="mr-2"
            color="grey-lighten-3"
            icon
            size="small"
            variant="tonal"
            @click="goToTrucks"
          >
            <v-icon color="teal" icon="mdi-truck" />
          </v-btn>
        </template>
        <span>Fleet</span>
      </v-tooltip>
    </div>

    <!-- Geotab Status Icon -->
    <v-tooltip v-if="authStore.isAuthenticated" location="bottom">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          class="mr-2"
          icon
          size="small"
          variant="text"
          @click="showGeotabDialog = true"
        >
          <v-avatar 
            :color="geotabStatus.isAuthenticated ? 'green' : 'amber'"
            size="28"
          >
            <span class="text-white font-weight-bold text-h6">G</span>
          </v-avatar>
        </v-btn>
      </template>
      <span>Geotab {{ geotabStatus.isAuthenticated ? 'Connected' : 'Disconnected' }}</span>
    </v-tooltip>

    <!-- User Menu -->
    <v-menu v-if="authStore.isAuthenticated">
      <template #activator="{ props }">
        <v-btn
          icon
          v-bind="props"
        >
          <v-avatar size="32">
            <v-icon icon="mdi-account-circle" size="32" />
          </v-avatar>
        </v-btn>
      </template>

      <v-list>
        <v-list-item
          :subtitle="authStore.user?.email"
          :title="`${authStore.user?.firstName || ''} ${authStore.user?.lastName || ''}`.trim() || 'User'"
        >
          <template #prepend>
            <v-avatar size="40">
              <v-icon icon="mdi-account-circle" />
            </v-avatar>
          </template>
        </v-list-item>

        <v-divider />

        <v-list-item
          prepend-icon="mdi-account"
          title="Profile"
          @click="goToProfile"
        />

        <v-list-item
          v-if="authStore.isAdmin()"
          prepend-icon="mdi-shield-crown"
          title="Administration"
          @click="goToAdmin"
        />

        <v-list-item
          prepend-icon="mdi-cog"
          title="Settings"
          @click="goToSettings"
        />

        <v-divider />

        <v-list-item
          prepend-icon="mdi-logout"
          title="Logout"
          @click="handleLogout"
        />
      </v-list>
    </v-menu>

    <!-- Login Button for non-authenticated users -->
    <v-btn
      v-else
      variant="outlined"
      @click="goToLogin"
    >
      Login
    </v-btn>

    <!-- Geotab Authentication Dialog -->
    <v-dialog v-model="showGeotabDialog" max-width="500px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-avatar 
            :color="geotabStatus.isAuthenticated ? 'green' : 'amber'"
            class="mr-3"
            size="32"
          >
            <span class="text-white font-weight-bold">G</span>
          </v-avatar>
          Geotab Integration
        </v-card-title>
        
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-alert 
                :type="geotabStatus.isAuthenticated ? 'success' : 'warning'"
                :text="geotabStatus.isAuthenticated ? 'Connected to Geotab' : 'Not connected to Geotab'"
                class="mb-4"
              />
            </v-col>
          </v-row>

          <!-- Authentication Status -->
          <v-row v-if="geotabStatus.isAuthenticated">
            <v-col cols="12">
              <v-list density="compact">
                <v-list-item>
                  <template #prepend>
                    <v-icon color="success" icon="mdi-database" />
                  </template>
                  <v-list-item-title>Database</v-list-item-title>
                  <v-list-item-subtitle>{{ geotabStatus.database }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon color="success" icon="mdi-account" />
                  </template>
                  <v-list-item-title>Username</v-list-item-title>
                  <v-list-item-subtitle>{{ geotabStatus.username }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon color="success" icon="mdi-key" />
                  </template>
                  <v-list-item-title>Session ID</v-list-item-title>
                  <v-list-item-subtitle class="font-mono">{{ geotabStatus.sessionId?.substring(0, 20) }}...</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template #prepend>
                    <v-icon color="success" icon="mdi-clock" />
                  </template>
                  <v-list-item-title>Last Authenticated</v-list-item-title>
                  <v-list-item-subtitle>{{ formatDate(geotabStatus.lastAuthenticated) }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

          <!-- Fleet Integration Info -->
          <v-row v-if="geotabStatus.isAuthenticated">
            <v-col cols="12">
              <v-divider class="my-4" />
              <h4 class="text-h6 mb-3">Fleet Integration</h4>
              <v-alert
                color="info"
                icon="mdi-information"
                variant="tonal"
              >
                Go to the Fleet page to sync odometer readings with your vehicles.
              </v-alert>
            </v-col>
          </v-row>

          <!-- Authentication Form -->
          <v-row v-else>
            <v-col cols="12">
              <v-form ref="geotabForm" v-model="geotabFormValid">
                <v-text-field
                  v-model="geotabCredentials.database"
                  label="Database"
                  :rules="[v => !!v || 'Database is required']"
                  variant="outlined"
                />
                <v-text-field
                  v-model="geotabCredentials.username"
                  label="Username"
                  :rules="[v => !!v || 'Username is required']"
                  variant="outlined"
                />
                <v-text-field
                  v-model="geotabCredentials.password"
                  label="Password"
                  :rules="[v => !!v || 'Password is required']"
                  :type="showPassword ? 'text' : 'password'"
                  variant="outlined"
                >
                  <template #append-inner>
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      @click="showPassword = !showPassword"
                    >
                      <v-icon :icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'" />
                    </v-btn>
                  </template>
                </v-text-field>
              </v-form>
            </v-col>
          </v-row>

          <!-- Error Message -->
          <v-row v-if="geotabError">
            <v-col cols="12">
              <v-alert type="error" :text="geotabError" />
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showGeotabDialog = false"
          >
            Close
          </v-btn>
          <v-btn
            v-if="geotabStatus.isAuthenticated"
            color="error"
            :loading="geotabLoading"
            variant="text"
            @click="disconnectGeotab"
          >
            Disconnect
          </v-btn>
          <v-btn
            v-else
            color="primary"
            :disabled="!geotabFormValid"
            :loading="geotabLoading"
            variant="flat"
            @click="authenticateGeotab"
          >
            Connect
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app-bar>
</template>

<script setup lang="ts">
  import { useAuthStore } from '@/stores/auth'
  import { feathersClient } from '@/services/feathers'

  defineEmits<{
    toggleSidebar: []
  }>()

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  // Geotab reactive data
  const showGeotabDialog = ref(false)
  const geotabLoading = ref(false)
  const geotabFormValid = ref(false)
  const geotabError = ref('')
  const showPassword = ref(false)
  const geotabStatus = ref({
    isAuthenticated: false,
    database: '',
    username: '',
    sessionId: '',
    lastAuthenticated: '',
    server: ''
  })

  // Geotab credentials form
  const geotabCredentials = ref({
    database: 'las2018',
    username: localStorage.getItem('geotab-username') || '',
    password: ''
  })

  const pageContext = computed(() => {
    const path = route.path
    
    // Handle dynamic routes with context
    if (path.startsWith('/dispatch/terminals/')) {
      return 'Live Dispatch'
    }
    
    if (path.startsWith('/planning/') && path !== '/planning') {
      return 'Route Planning'
    }
    
    if (path.startsWith('/terminals/')) {
      return 'Terminal Details'
    }
    
    if (path.startsWith('/routes/') && !path.includes('/planning')) {
      return 'Route Details'
    }
    
    if (path.startsWith('/drivers/')) {
      return 'Driver Details'
    }
    
    // Static page contexts
    const contextMap: Record<string, string> = {
      '/': 'Dashboard',
      '/user-profile': 'User Profile',
      '/user-auth': 'Authentication',
      '/operations-hub': 'Operations Hub',
      '/dispatch': 'Dispatch Center',
      '/drivers': 'Driver Management',
      '/terminals': 'Terminal Operations',
      '/planning': 'Route Planning',
      '/routes': 'Route Management',
      '/reports': 'Reports & Analytics',
      '/admin': 'Administration',
    }

    return contextMap[path] || ''
  })

  const terminalContext = computed(() => {
    const path = route.path
    
    // Extract terminal identifier from URL
    if (path.startsWith('/dispatch/terminals/') || 
        path.startsWith('/planning/') && path !== '/planning' ||
        path.startsWith('/terminals/')) {
      
      const segments = path.split('/')
      let terminalId = ''
      
      if (path.startsWith('/dispatch/terminals/')) {
        terminalId = segments[3] // /dispatch/terminals/TERMINAL-ID
      } else if (path.startsWith('/planning/')) {
        terminalId = segments[2] // /planning/TERMINAL-ID
      } else if (path.startsWith('/terminals/')) {
        terminalId = segments[2] // /terminals/TERMINAL-ID
      }
      
      if (terminalId) {
        // Convert URL-safe ID back to readable format
        return terminalId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
    }
    
    return ''
  })

  const goToProfile = () => {
    router.push('/user-profile')
  }

  const goToAdmin = () => {
    // TODO: Implement admin page
  }

  const goToSettings = () => {
    // TODO: Implement settings page
  }

  const goToLogin = () => {
    router.push('/user-auth')
  }

  // Quick navigation functions
  const goToOperationsHub = () => {
    router.push('/operations-hub')
  }
  const goToTerminals = () => {
    router.push('/terminals')
  }

  const goToRoutes = () => {
    router.push('/routes')
  }

  const goToDrivers = () => {
    router.push('/drivers')
  }

  const goToTrucks = () => {
    router.push('/fleet')
  }

  // Geotab functions - no longer loads from database
  const loadGeotabStatus = async () => {
    // Try to load from localStorage first
    try {
      const storedStatus = localStorage.getItem('geotabStatus')
      if (storedStatus) {
        const parsed = JSON.parse(storedStatus)
        // Validate the stored data has required fields
        if (parsed.isAuthenticated && parsed.database && parsed.username) {
          geotabStatus.value = parsed
          console.log('Loaded Geotab status from localStorage:', {
            database: parsed.database,
            username: parsed.username,
            hasPassword: !!parsed.password,
            hasSessionId: !!parsed.sessionId
          })
          return
        }
      }
    } catch (error) {
      console.error('Error loading Geotab status from localStorage:', error)
    }

    // Fallback to disconnected state
    geotabStatus.value = {
      isAuthenticated: false,
      database: '',
      username: '',
      sessionId: '',
      lastAuthenticated: '',
      server: ''
    }
  }

  const authenticateGeotab = async () => {
    try {
      geotabLoading.value = true
      geotabError.value = ''

      const result = await (feathersClient.service('geotab') as any).authenticate({
        database: geotabCredentials.value.database,
        username: geotabCredentials.value.username,
        password: geotabCredentials.value.password
      })

      if (result.success) {
        // Save username to localStorage (not password for security)
        localStorage.setItem('geotab-username', geotabCredentials.value.username)
        
        // Update status directly since we don't store in database
        // Keep password in memory for session duration
        geotabStatus.value = {
          isAuthenticated: true,
          database: geotabCredentials.value.database,
          username: geotabCredentials.value.username,
          password: geotabCredentials.value.password, // Keep password for session
          sessionId: result.sessionId || '',
          lastAuthenticated: new Date().toISOString(),
          server: result.server || ''
        }

        // Also save to localStorage for other components to access
        localStorage.setItem('geotabStatus', JSON.stringify(geotabStatus.value))
        
        showGeotabDialog.value = false
        // Don't clear password - keep it for session duration
        showPassword.value = false
      } else {
        geotabError.value = result.error || 'Authentication failed'
      }
    } catch (error: any) {
      console.error('Geotab authentication error:', error)
      geotabError.value = error.message || 'Authentication failed'
    } finally {
      geotabLoading.value = false
    }
  }

  const disconnectGeotab = async () => {
    try {
      geotabLoading.value = true
      await (feathersClient.service('geotab') as any).logout()
      
      // Clear local status since we don't store in database
      geotabStatus.value = {
        isAuthenticated: false,
        database: '',
        username: '',
        password: '', // Clear password on logout
        sessionId: '',
        lastAuthenticated: '',
        server: ''
      }

      // Also clear localStorage
      localStorage.removeItem('geotabStatus')
      
      // Session cleared
      
      showGeotabDialog.value = false
      showPassword.value = false
    } catch (error) {
      console.error('Error disconnecting Geotab:', error)
    } finally {
      geotabLoading.value = false
    }
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Note: Fleet odometer sync functionality moved to fleet page

  // Note: Fleet device matching functionality moved to fleet page

  // Expose geotab status and dialog control for other components
  const getGeotabStatus = () => geotabStatus.value
  const openGeotabDialog = () => {
    showGeotabDialog.value = true
  }
  
  // Make geotab functions available globally
  if (typeof window !== 'undefined') {
    (window as any).getGeotabStatus = getGeotabStatus
    (window as any).openGeotabDialog = openGeotabDialog
  }

  const handleLogout = async () => {
    const success = await authStore.logout()
    if (success) {
      router.push('/user-auth')
    }
  }

  // Load Geotab status when component mounts
  onMounted(() => {
    if (authStore.isAuthenticated) {
      loadGeotabStatus()
    }
  })

  // Watch for authentication changes
  watch(() => authStore.isAuthenticated, (authenticated) => {
    if (authenticated) {
      loadGeotabStatus()
    } else {
      geotabStatus.value.isAuthenticated = false
    }
  })
</script>
