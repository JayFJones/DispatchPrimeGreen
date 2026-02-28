<template>
  <v-app>
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <AppSidebar v-model="sidebarOpen" />

    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>

    <AppFooter />
  </v-app>
</template>

<script lang="ts" setup>
  import AppFooter from '@/components/AppFooter.vue'
  import AppHeader from '@/components/AppHeader.vue'
  import AppSidebar from '@/components/AppSidebar.vue'

  const sidebarOpen = ref(false)
</script>
