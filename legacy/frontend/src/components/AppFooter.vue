<template>
  <v-footer
    app
    class="text-center d-flex flex-column"
    color="grey-lighten-5"
  >
    <div class="d-flex justify-center align-center flex-wrap">
      <v-btn
        v-for="link in links"
        :key="link.text"
        class="mx-2"
        color="primary"
        size="small"
        variant="text"
        @click="link.action"
      >
        {{ link.text }}
      </v-btn>
    </div>

    <div class="pt-2">
      <v-divider class="mb-2" />
      <span class="text-caption text-medium-emphasis">
        {{ new Date().getFullYear() }} —
        <strong>DispatchPrime</strong>
        — Logistics Management System
      </span>
    </div>
  </v-footer>
</template>

<script setup lang="ts">
  const links = [
    {
      text: 'About',
      action: () => {
        // TODO: Implement about page
      },
    },
    {
      text: 'Support',
      action: () => {
        // TODO: Implement support page
      },
    },
    {
      text: 'Privacy',
      action: () => {
        // TODO: Implement privacy page
      },
    },
    {
      text: 'Terms',
      action: () => {
        // TODO: Implement terms page
      },
    },
  ]
</script>
