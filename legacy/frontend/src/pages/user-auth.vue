<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height no-gutters">
      <!-- Left Pane -->
      <v-col class="d-flex align-center justify-center" cols="12" md="6">
        <v-card
          class="pa-8 text-center"
          flat
          max-width="400"
          width="100%"
        >
          <div v-if="authStore.viewMode === 'login'">
            <h2 class="text-h4 mb-4 text-primary">
              Welcome to DispatchPrime
            </h2>
            <p class="text-body-1 mb-6 text-medium-emphasis">
              Your complete dispatch and shipping management solution.
              Streamline your operations and keep track of all your shipments in one place.
            </p>
            <v-btn
              color="primary"
              :disabled="authStore.isLoading"
              size="large"
              variant="outlined"
              @click="authStore.setViewMode('register')"
            >
              New User?
            </v-btn>
          </div>

          <div v-else>
            <h2 class="text-h4 mb-4 text-primary">
              Already have an account?
            </h2>
            <p class="text-body-1 mb-6 text-medium-emphasis">
              Sign in to access your dashboard and manage your dispatch operations.
            </p>
            <v-btn
              color="primary"
              :disabled="authStore.isLoading"
              size="large"
              variant="outlined"
              @click="authStore.setViewMode('login')"
            >
              Sign In
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- Right Pane -->
      <v-col class="d-flex align-center justify-center bg-grey-lighten-4" cols="12" md="6">
        <v-card
          class="pa-8"
          elevation="2"
          max-width="400"
          width="100%"
        >
          <!-- Login Form -->
          <div v-if="authStore.viewMode === 'login'">
            <h3 class="text-h5 mb-6 text-center">Sign In</h3>

            <v-form @submit.prevent="handleLogin">
              <v-text-field
                v-model="loginForm.email"
                class="mb-3"
                label="Email"
                required
                :rules="emailRules"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="loginForm.password"
                :append-inner-icon="showLoginPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="mb-4"
                label="Password"
                required
                :rules="passwordRules"
                :type="showLoginPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showLoginPassword = !showLoginPassword"
              />

              <v-btn
                block
                color="primary"
                :loading="authStore.isLoading"
                size="large"
                type="submit"
              >
                Sign In
              </v-btn>
            </v-form>

            <div class="text-center mt-4">
              <v-btn
                color="primary"
                size="small"
                variant="text"
                @click="handleForgotPassword"
              >
                Forgot Password?
              </v-btn>
            </div>
          </div>

          <!-- Registration Form -->
          <div v-else>
            <h3 class="text-h5 mb-6 text-center">Create Account</h3>

            <v-form @submit.prevent="handleRegister">
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.firstName"
                    class="mb-3"
                    label="First Name"
                    required
                    :rules="nameRules"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.lastName"
                    class="mb-3"
                    label="Last Name"
                    required
                    :rules="nameRules"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-text-field
                v-model="registerForm.email"
                class="mb-3"
                label="Email"
                required
                :rules="emailRules"
                type="email"
                variant="outlined"
              />

              <v-text-field
                v-model="registerForm.password"
                :append-inner-icon="showRegisterPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="mb-3"
                label="Password"
                required
                :rules="passwordRules"
                :type="showRegisterPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showRegisterPassword = !showRegisterPassword"
              />

              <v-text-field
                v-model="registerForm.confirmPassword"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                class="mb-4"
                label="Confirm Password"
                required
                :rules="confirmPasswordRules"
                :type="showConfirmPassword ? 'text' : 'password'"
                variant="outlined"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
              />

              <v-btn
                block
                color="primary"
                :loading="authStore.isLoading"
                size="large"
                type="submit"
              >
                Create Account
              </v-btn>
            </v-form>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Error Snackbar -->
    <v-snackbar
      v-model="showError"
      color="error"
      location="top"
      :timeout="5000"
    >
      {{ authStore.error }}
      <template #actions>
        <v-btn
          variant="text"
          @click="authStore.clearError"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()

  const loginForm = ref({
    email: '',
    password: '',
  })

  const registerForm = ref({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Password visibility toggles
  const showLoginPassword = ref(false)
  const showRegisterPassword = ref(false)
  const showConfirmPassword = ref(false)

  const showError = computed({
    get: () => !!authStore.error,
    set: (value: boolean) => {
      if (!value) authStore.clearError()
    },
  })

  const emailRules = [
    (v: string) => !!v || 'Email is required',
    (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid',
  ]

  const passwordRules = [
    (v: string) => !!v || 'Password is required',
    (v: string) => v.length >= 6 || 'Password must be at least 6 characters',
  ]

  const nameRules = [
    (v: string) => !!v || 'This field is required',
    (v: string) => v.length >= 2 || 'Must be at least 2 characters',
  ]

  const confirmPasswordRules = [
    (v: string) => !!v || 'Please confirm your password',
    (v: string) => v === registerForm.value.password || 'Passwords do not match',
  ]

  const handleLogin = async () => {
    const success = await authStore.login(loginForm.value.email, loginForm.value.password)
    if (success) {
      await router.push('/')
    }
  }

  const handleRegister = async () => {
    const success = await authStore.register(
      registerForm.value.email,
      registerForm.value.password,
      registerForm.value.firstName,
      registerForm.value.lastName,
    )
    if (success) {
      // Redirect to user profile page
      await router.push('/user-profile')
    }
  }

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
  }

  // Redirect to BISMARCK terminal if already authenticated
  onMounted(() => {
    if (authStore.isAuthenticated) {
      router.push('/terminal?name=BISMARCK')
    }
  })
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
