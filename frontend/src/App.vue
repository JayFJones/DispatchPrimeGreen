<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from './stores/auth.js';

const auth = useAuthStore();

onMounted(() => {
  auth.initialize();
});
</script>

<template>
  <div v-if="auth.isLoading" class="flex min-h-screen items-center justify-center">
    <p class="text-gray-500">Loading...</p>
  </div>
  <router-view v-else />
</template>
