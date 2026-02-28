import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { Role } from '@dispatch/shared/constants/roles';
import { setAccessToken } from '../api/client.js';
import {
  login as apiLogin,
  logout as apiLogout,
  refreshAccessToken,
  register as apiRegister,
} from '../api/auth.js';
import type { UserCreate } from '@dispatch/shared/types/user';

interface AuthUser {
  sub: string;
  email: string;
  roles: Role[];
  homeTerminalId: string | null;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  function setAuth(accessToken: string, authUser: AuthUser) {
    setAccessToken(accessToken);
    user.value = authUser;
    error.value = null;
  }

  function clearAuth() {
    setAccessToken(null);
    user.value = null;
  }

  /**
   * Attempt silent refresh on app load. If the refresh cookie is valid,
   * the user stays logged in across page reloads.
   */
  async function initialize(): Promise<void> {
    isLoading.value = true;
    try {
      const result = await refreshAccessToken();
      setAuth(result.accessToken, result.user);
    } catch {
      clearAuth();
    } finally {
      isLoading.value = false;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await apiLogin(email, password);
      setAuth(result.accessToken, result.user);
    } catch (err) {
      clearAuth();
      error.value = err instanceof Error ? err.message : 'Login failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout();
    } catch {
      // Best effort — clear local state regardless
    } finally {
      clearAuth();
    }
  }

  async function register(data: UserCreate): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await apiRegister(data);
      setAuth(result.accessToken, result.user);
    } catch (err) {
      clearAuth();
      error.value = err instanceof Error ? err.message : 'Registration failed';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function hasRole(role: Role): boolean {
    return user.value?.roles.includes(role) ?? false;
  }

  function hasAnyRole(...roles: Role[]): boolean {
    return roles.some((r) => user.value?.roles.includes(r));
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    initialize,
    login,
    logout,
    register,
    hasRole,
    hasAnyRole,
  };
});
