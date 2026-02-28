// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { passwordHash } from '@feathersjs/authentication-local'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { UserService } from './users.class'

// User roles enum
export enum UserRole {
  ADMIN = 'admin',
  OPERATIONS_MANAGER = 'operations_manager',
  TERMINAL_MANAGER = 'terminal_manager',
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  DASHBOARD = 'dashboard'
}

// Role schema for validation
export const userRoleSchema = Type.Enum(UserRole)

// Main data model schema
export const userSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    email: Type.String(),
    password: Type.Optional(Type.String()),
    firstName: Type.Optional(Type.String()),
    lastName: Type.Optional(Type.String()),
    roles: Type.Optional(Type.Array(userRoleSchema, { default: [UserRole.DASHBOARD] })),
    homeTerminalId: Type.Optional(Type.String()), // Reference to terminal _id
    favoriteTerminalIds: Type.Optional(Type.Array(Type.String())), // Array of terminal _ids
    lastLoggedIn: Type.Optional(Type.String({ format: 'date-time' })),
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'User', additionalProperties: false }
)
export type User = Static<typeof userSchema>
export const userValidator = getValidator(userSchema, dataValidator)
export const userResolver = resolve<User, HookContext<UserService>>({})

export const userExternalResolver = resolve<User, HookContext<UserService>>({
  // The password should never be visible externally
  password: async () => undefined
})

// Schema for creating new entries
export const userDataSchema = Type.Pick(userSchema, ['email', 'password', 'firstName', 'lastName', 'roles', 'homeTerminalId', 'favoriteTerminalIds'], {
  $id: 'UserData'
})
export type UserData = Static<typeof userDataSchema>
export const userDataValidator = getValidator(userDataSchema, dataValidator)
export const userDataResolver = resolve<User, HookContext<UserService>>({
  password: passwordHash({ strategy: 'local' }),
  roles: async value => value || [UserRole.DASHBOARD],
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const userPatchSchema = Type.Partial(userSchema, {
  $id: 'UserPatch'
})
export type UserPatch = Static<typeof userPatchSchema>
export const userPatchValidator = getValidator(userPatchSchema, dataValidator)
export const userPatchResolver = resolve<User, HookContext<UserService>>({
  password: passwordHash({ strategy: 'local' }),
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const userQueryProperties = Type.Pick(userSchema, [
  '_id',
  'email',
  'firstName',
  'lastName',
  'roles',
  'homeTerminalId',
  'favoriteTerminalIds',
  'createdAt',
  'updatedAt'
])
export const userQuerySchema = Type.Intersect(
  [
    querySyntax(userQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type UserQuery = Static<typeof userQuerySchema>
export const userQueryValidator = getValidator(userQuerySchema, queryValidator)
export const userQueryResolver = resolve<UserQuery, HookContext<UserService>>({
  // If there is a user (e.g. with authentication), they are only allowed to see their own data
  // UNLESS they are an admin, then they can see all users
  _id: async (value, _user, context) => {
    if (context.params.user) {
      // Check if user has admin role
      const currentUser = context.params.user
      const isAdmin = currentUser.roles && currentUser.roles.includes(UserRole.ADMIN)

      // If user is admin, allow them to see all users (return undefined to not filter)
      if (isAdmin) {
        return value
      }

      // Otherwise, only allow them to see their own data
      return context.params.user._id
    }

    return value
  }
})
