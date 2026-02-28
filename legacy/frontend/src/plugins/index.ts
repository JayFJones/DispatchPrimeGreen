/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Types
import type { App } from 'vue'
import router from '../router'
import pinia from '../stores'
import { useAuthStore } from '../stores/auth'

// Plugins
import vuetify from './vuetify'

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)

  // Initialize authentication after Pinia is configured
  const authStore = useAuthStore()
  authStore.initializeAuth()
}
