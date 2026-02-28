import { defineStore } from 'pinia'
import { feathersClient } from '@/services/feathers'

export enum UserRole {
  ADMIN = 'admin',
  OPERATIONS_MANAGER = 'operations_manager',
  TERMINAL_MANAGER = 'terminal_manager',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  DASHBOARD = 'dashboard',
}

export interface User {
  id: string
  _id: string
  email: string
  firstName?: string
  lastName?: string
  roles?: UserRole[]
  homeTerminalId?: string
  favoriteTerminalIds?: string[]
  lastLoggedIn?: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  viewMode: 'login' | 'register'
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    viewMode: 'login',
  }),

  actions: {
    async initializeAuth () {
      this.setLoading(true)

      try {
        const response = await feathersClient.reAuthenticate()

        if (response.user) {
          this.setUser({
            id: response.user.id || response.user._id,
            _id: response.user._id || response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            roles: response.user.roles || [UserRole.DASHBOARD],
            homeTerminalId: response.user.homeTerminalId,
            favoriteTerminalIds: response.user.favoriteTerminalIds || [],
            createdAt: response.user.createdAt,
            updatedAt: response.user.updatedAt,
          })
        }
      } catch {
        // Silent failure - no stored token or invalid token
        this.setUser(null)
      } finally {
        this.setLoading(false)
      }
    },
    setViewMode (mode: 'login' | 'register') {
      this.viewMode = mode
      this.error = null
    },

    setLoading (loading: boolean) {
      this.isLoading = loading
    },

    setError (error: string | null) {
      this.error = error
    },

    setUser (user: User | null) {
      this.user = user
      this.isAuthenticated = !!user
    },

    async login (email: string, password: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        const response = await feathersClient.authenticate({
          strategy: 'local',
          email,
          password,
        })

        if (response.user) {
          this.setUser({
            id: response.user.id || response.user._id,
            _id: response.user._id || response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            roles: response.user.roles || [UserRole.DASHBOARD],
            homeTerminalId: response.user.homeTerminalId,
            favoriteTerminalIds: response.user.favoriteTerminalIds || [],
            createdAt: response.user.createdAt,
            updatedAt: response.user.updatedAt,
          })
        }

        return true
      } catch (error) {
        this.setError(error instanceof Error ? error.message : 'Login failed')
        return false
      } finally {
        this.setLoading(false)
      }
    },

    async register (email: string, password: string, firstName: string, lastName: string) {
      this.setLoading(true)
      this.setError(null)

      try {
        await feathersClient.service('users').create({
          email,
          password,
          firstName,
          lastName,
        })

        // After successful registration, automatically log in
        const loginSuccess = await this.login(email, password)

        return loginSuccess
      } catch (error) {
        this.setError(error instanceof Error ? error.message : 'Registration failed')
        return false
      } finally {
        this.setLoading(false)
      }
    },

    async logout () {
      this.setLoading(true)

      try {
        await feathersClient.logout()

        this.setUser(null)
        this.setViewMode('login')

        return true
      } catch (error) {
        this.setError(error instanceof Error ? error.message : 'Logout failed')
        return false
      } finally {
        this.setLoading(false)
      }
    },

    async reAuthenticate () {
      try {
        const response = await feathersClient.reAuthenticate()

        if (response.user) {
          this.setUser({
            id: response.user.id || response.user._id,
            _id: response.user._id || response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            roles: response.user.roles || [UserRole.DASHBOARD],
            homeTerminalId: response.user.homeTerminalId,
            favoriteTerminalIds: response.user.favoriteTerminalIds || [],
            createdAt: response.user.createdAt,
            updatedAt: response.user.updatedAt,
          })
          
          return response
        }
      } catch (error) {
        console.error('Re-authentication failed:', error)
        throw error
      }
    },

    clearError () {
      this.error = null
    },

    // Role checking methods
    hasRole (role: UserRole): boolean {
      return this.user?.roles?.includes(role) || false
    },

    hasAnyRole (roles: UserRole[]): boolean {
      return roles.some(role => this.hasRole(role))
    },

    hasAllRoles (roles: UserRole[]): boolean {
      return roles.every(role => this.hasRole(role))
    },

    isAdmin (): boolean {
      return this.hasRole(UserRole.ADMIN)
    },

    getUserRoleNames (): string[] {
      const roleNames: Record<UserRole, string> = {
        [UserRole.ADMIN]: 'Administrator',
        [UserRole.OPERATIONS_MANAGER]: 'Operations Manager',
        [UserRole.TERMINAL_MANAGER]: 'Terminal Manager',
        [UserRole.DISPATCHER]: 'Dispatcher',
        [UserRole.DRIVER]: 'Driver',
        [UserRole.DASHBOARD]: 'Dashboard User',
      }

      return this.user?.roles?.map(role => roleNames[role]) || []
    },
  },
})
