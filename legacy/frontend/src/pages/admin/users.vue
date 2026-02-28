<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card color="blue" dark>
          <v-card-text class="text-center py-4">
            <v-icon class="mb-2" icon="mdi-account-multiple" size="40" />
            <h1 class="text-h4 mb-1">User Management</h1>
            <p class="text-subtitle-1">
              Manage system users, roles, and permissions
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Controls -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          clear-icon="mdi-close"
          clearable
          hide-details
          label="Search users..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
      </v-col>

      <v-col cols="12" md="3">
        <v-select
          v-model="roleFilter"
          clearable
          hide-details
          :items="roleFilterOptions"
          label="Filter by role"
          variant="outlined"
        />
      </v-col>

      <v-col class="d-flex align-center" cols="12" md="3">
        <v-btn
          block
          color="primary"
          prepend-icon="mdi-account-plus"
          @click="openAddUserDialog"
        >
          Add User
        </v-btn>
      </v-col>
    </v-row>

    <!-- Users Table -->
    <v-card>
      <v-card-title>
        <v-icon class="mr-2" icon="mdi-table" />
        Users ({{ filteredUsers.length }})
      </v-card-title>

      <v-data-table
        class="elevation-1"
        :headers="headers"
        item-key="id"
        :items="filteredUsers"
        :items-per-page="10"
        :loading="loading"
        :search="search"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center">
            <v-avatar class="mr-3" size="32">
              <v-icon icon="mdi-account-circle" />
            </v-avatar>
            <div>
              <div class="font-weight-medium">
                {{ item.firstName }} {{ item.lastName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ item.email }}
              </div>
            </div>
          </div>
        </template>

        <template #item.roles="{ item }">
          <v-chip-group>
            <v-chip
              v-for="role in item.roles"
              :key="role"
              :color="getRoleColor(role)"
              size="x-small"
              variant="flat"
            >
              {{ getRoleDisplayName(role) }}
            </v-chip>
          </v-chip-group>
        </template>

        <template #item.lastLoggedIn="{ item }">
          {{ formatDate(item.lastLoggedIn) || 'Never' }}
        </template>

        <template #item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="editUser(item)"
          />
          <v-btn
            color="error"
            :disabled="item.id === authStore.user?.id"
            icon="mdi-delete"
            size="small"
            variant="text"
            @click="deleteUser(item)"
          />
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon class="mb-4" color="grey-lighten-2" icon="mdi-account-off" size="64" />
            <h3 class="text-h6 text-grey">No users found</h3>
            <p class="text-body-2 text-grey-lighten-1">
              Try adjusting your search or filters
            </p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit User Dialog -->
    <v-dialog v-model="userDialog" max-width="600">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" :icon="editingUser ? 'mdi-pencil' : 'mdi-account-plus'" />
          {{ editingUser ? 'Edit User' : 'Add New User' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="userForm" v-model="formValid">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="userFormData.firstName"
                  label="First Name"
                  required
                  :rules="[v => !!v || 'First name is required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="userFormData.lastName"
                  label="Last Name"
                  required
                  :rules="[v => !!v || 'Last name is required']"
                />
              </v-col>
            </v-row>

            <v-text-field
              v-model="userFormData.email"
              label="Email"
              required
              :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Email must be valid']"
              type="email"
            />

            <v-text-field
              v-if="!editingUser"
              v-model="userFormData.password"
              label="Password"
              required
              :rules="[v => !!v || 'Password is required', v => v.length >= 6 || 'Password must be at least 6 characters']"
              type="password"
            />

            <v-select
              v-model="userFormData.roles"
              chips
              :items="availableRoles"
              label="Roles"
              multiple
              required
              :rules="[v => v && v.length > 0 || 'At least one role is required']"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="userDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!formValid"
            :loading="saving"
            @click="saveUser"
          >
            {{ editingUser ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
  import { feathersClient } from '@/services/feathers'
  import { useAuthStore, type User, UserRole } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  // Reactive data
  const search = ref('')
  const roleFilter = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const users = ref<User[]>([])
  const userDialog = ref(false)
  const formValid = ref(false)
  const editingUser = ref<User | null>(null)

  // Form data
  const userFormData = ref({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roles: [UserRole.DASHBOARD],
  })

  // Table headers
  const headers = [
    { title: 'User', key: 'name', sortable: false },
    { title: 'Roles', key: 'roles', sortable: false },
    { title: 'Last Login', key: 'lastLoggedIn', sortable: true },
    { title: 'Created', key: 'createdAt', sortable: true },
    { title: 'Actions', key: 'actions', sortable: false, align: 'center' as const },
  ]

  // Role options
  const availableRoles = [
    { title: 'Administrator', value: UserRole.ADMIN },
    { title: 'Operations Manager', value: UserRole.OPERATIONS_MANAGER },
    { title: 'Terminal Manager', value: UserRole.TERMINAL_MANAGER },
    { title: 'Dispatcher', value: UserRole.DISPATCHER },
    { title: 'Driver', value: UserRole.DRIVER },
    { title: 'Dashboard User', value: UserRole.DASHBOARD },
  ]

  const roleFilterOptions = [
    { title: 'All Roles', value: '' },
    ...availableRoles,
  ]

  // Computed
  const filteredUsers = computed(() => {
    let filtered = users.value

    if (roleFilter.value) {
      filtered = filtered.filter(user =>
        user.roles?.includes(roleFilter.value as UserRole),
      )
    }

    return filtered
  })

  // Methods
  const refreshUsers = async () => {
    loading.value = true
    try {
      const result = await feathersClient.service('users').find({
        query: {
          $limit: 100,
          $sort: { createdAt: -1 },
        },
      })

      users.value = result.data.map((user: any) => ({
        id: user._id || user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        roles: user.roles || [UserRole.DASHBOARD],
        lastLoggedIn: user.lastLoggedIn,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }))
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      loading.value = false
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const getRoleColor = (role: UserRole) => {
    const colorMap: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'red',
      [UserRole.OPERATIONS_MANAGER]: 'orange',
      [UserRole.TERMINAL_MANAGER]: 'amber',
      [UserRole.DISPATCHER]: 'green',
      [UserRole.DRIVER]: 'blue',
      [UserRole.DASHBOARD]: 'grey',
    }
    return colorMap[role] || 'primary'
  }

  const getRoleDisplayName = (role: UserRole) => {
    const nameMap: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'Admin',
      [UserRole.OPERATIONS_MANAGER]: 'Ops Mgr',
      [UserRole.TERMINAL_MANAGER]: 'Terminal',
      [UserRole.DISPATCHER]: 'Dispatch',
      [UserRole.DRIVER]: 'Driver',
      [UserRole.DASHBOARD]: 'Dashboard',
    }
    return nameMap[role] || role
  }

  const openAddUserDialog = () => {
    editingUser.value = null
    userFormData.value = {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roles: [UserRole.DASHBOARD],
    }
    userDialog.value = true
  }

  const editUser = (user: User) => {
    editingUser.value = user
    userFormData.value = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      password: '',
      roles: user.roles || [UserRole.DASHBOARD],
    }
    userDialog.value = true
  }

  const saveUser = async () => {
    saving.value = true
    try {
      if (editingUser.value) {
        // Update existing user
        await feathersClient.service('users').patch(editingUser.value.id, {
          firstName: userFormData.value.firstName,
          lastName: userFormData.value.lastName,
          email: userFormData.value.email,
          roles: userFormData.value.roles,
        })
      } else {
        // Create new user
        await feathersClient.service('users').create({
          firstName: userFormData.value.firstName,
          lastName: userFormData.value.lastName,
          email: userFormData.value.email,
          password: userFormData.value.password,
          roles: userFormData.value.roles,
        })
      }

      userDialog.value = false
      await refreshUsers()
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      saving.value = false
    }
  }

  const deleteUser = async (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        await feathersClient.service('users').remove(user.id)
        await refreshUsers()
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  // Check admin permissions and load users
  onMounted(async () => {
    if (!authStore.isAdmin()) {
      router.push('/')
      return
    }

    await refreshUsers()
  })
</script>

<style scoped>
.v-data-table {
  background: transparent;
}
</style>
