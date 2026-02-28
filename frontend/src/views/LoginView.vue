<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

const isRegisterMode = ref(false);
const email = ref('');
const password = ref('');
const firstName = ref('');
const lastName = ref('');
const formError = ref<string | null>(null);
const submitting = ref(false);

async function handleSubmit() {
  formError.value = null;
  submitting.value = true;

  try {
    if (isRegisterMode.value) {
      await auth.register({
        email: email.value,
        password: password.value,
        firstName: firstName.value || null,
        lastName: lastName.value || null,
      });
    } else {
      await auth.login(email.value, password.value);
    }
    router.push('/');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    submitting.value = false;
  }
}

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value;
  formError.value = null;
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
      <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">
        {{ isRegisterMode ? 'Create Account' : 'Sign In' }}
      </h1>

      <div
        v-if="formError"
        class="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ formError }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <template v-if="isRegisterMode">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                v-model="firstName"
                type="text"
                autocomplete="given-name"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                v-model="lastName"
                type="text"
                autocomplete="family-name"
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
        </template>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            :minlength="isRegisterMode ? 8 : undefined"
            autocomplete="current-password"
            class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <p v-if="isRegisterMode" class="mt-1 text-xs text-gray-500">
            Must be at least 8 characters
          </p>
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ submitting ? 'Please wait...' : isRegisterMode ? 'Create Account' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        {{ isRegisterMode ? 'Already have an account?' : "Don't have an account?" }}
        <button
          type="button"
          class="ml-1 font-medium text-green-600 hover:text-green-500"
          @click="toggleMode"
        >
          {{ isRegisterMode ? 'Sign in' : 'Create one' }}
        </button>
      </p>
    </div>
  </div>
</template>
