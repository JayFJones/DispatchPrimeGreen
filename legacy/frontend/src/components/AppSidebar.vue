<template>
  <v-navigation-drawer
    v-model="isOpen"
    app
    temporary
    width="280"
  >
    <v-list-item
      subtitle="Logistics Management"
      title="DispatchPrime"
    >
      <template #prepend>
        <v-icon
          color="primary"
          icon="mdi-truck-delivery"
          size="40"
        />
      </template>
    </v-list-item>

    <v-divider />

    <v-list density="compact" nav>
      <!-- Dashboard -->
      <v-list-item
        :active="route.path === '/'"
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        @click="navigateTo('/')"
      />

      <!-- Operations Hub -->
      <v-list-item
        :active="route.path === '/operations-hub'"
        prepend-icon="mdi-monitor-dashboard"
        title="Operations Hub"
        @click="navigateTo('/operations-hub')"
      />

      <!-- Operations Section -->
      <v-list-group value="operations">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-cogs"
            title="Operations"
          />
        </template>

        <v-list-item
          :active="route.path === '/dispatch'"
          prepend-icon="mdi-radio-tower"
          title="Dispatch Center"
          @click="navigateTo('/dispatch')"
        />

        <v-list-item
          :active="route.path === '/drivers'"
          prepend-icon="mdi-truck"
          title="Driver Management"
          @click="navigateTo('/drivers')"
        />

        <v-list-item
          :active="route.path === '/terminals'"
          prepend-icon="mdi-office-building"
          title="Terminal Operations"
          @click="navigateTo('/terminals')"
        />
      </v-list-group>

      <!-- Reports Section -->
      <v-list-group value="reports">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-chart-line"
            title="Reports & Analytics"
          />
        </template>

        <v-list-item
          prepend-icon="mdi-chart-bar"
          title="Performance Reports"
          @click="navigateTo('/reports/performance')"
        />

        <v-list-item
          prepend-icon="mdi-currency-usd"
          title="Financial Reports"
          @click="navigateTo('/reports/financial')"
        />

        <v-list-item
          prepend-icon="mdi-account-group"
          title="Driver Reports"
          @click="navigateTo('/reports/drivers')"
        />
      </v-list-group>

      <!-- Administration (Admin only) -->
      <v-list-item
        v-if="authStore.isAdmin()"
        :active="route.path.startsWith('/admin')"
        prepend-icon="mdi-shield-crown"
        title="Administration"
        @click="navigateTo('/admin/')"
      />
    </v-list>

    <template #append>
      <div class="pa-2">
        <v-btn
          block
          color="primary"
          prepend-icon="mdi-account"
          variant="outlined"
          @click="navigateTo('/user-profile')"
        >
          View Profile
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
  import { useAuthStore } from '@/stores/auth'

  const props = defineProps<{
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()

  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  })

  const navigateTo = (path: string) => {
    router.push(path)
    isOpen.value = false // Close sidebar after navigation on mobile
  }
</script>
