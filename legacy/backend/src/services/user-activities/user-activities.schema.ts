import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { UserActivityService } from './user-activities.class'
import { UserRole } from '../users/users.schema'

// Activity types enum
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  FAILED_LOGIN = 'failed_login',
  PROFILE_UPDATE = 'profile_update',
  PASSWORD_CHANGE = 'password_change'
}

// Main data model schema
export const userActivitySchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    userId: Type.Optional(ObjectIdSchema()),
    type: Type.Enum(ActivityType),
    description: Type.String(),
    ipAddress: Type.Optional(Type.String()),
    userAgent: Type.Optional(Type.String()),
    acknowledged: Type.Optional(Type.Boolean()),
    acknowledgedAt: Type.Optional(Type.String({ format: 'date-time' })),
    metadata: Type.Optional(Type.Object({}, { additionalProperties: true })),
    createdAt: Type.String({ format: 'date-time' })
  },
  { $id: 'UserActivity', additionalProperties: false }
)
export type UserActivity = Static<typeof userActivitySchema>
export const userActivityValidator = getValidator(userActivitySchema, dataValidator)
export const userActivityResolver = resolve<UserActivity, HookContext<UserActivityService>>({})

export const userActivityExternalResolver = resolve<UserActivity, HookContext<UserActivityService>>({})

// Schema for creating new entries
export const userActivityDataSchema = Type.Pick(
  userActivitySchema,
  ['userId', 'type', 'description', 'ipAddress', 'userAgent', 'acknowledged', 'acknowledgedAt', 'metadata'],
  {
    $id: 'UserActivityData'
  }
)
export type UserActivityData = Static<typeof userActivityDataSchema>
export const userActivityDataValidator = getValidator(userActivityDataSchema, dataValidator)
export const userActivityDataResolver = resolve<UserActivity, HookContext<UserActivityService>>({
  createdAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const userActivityPatchSchema = Type.Partial(userActivitySchema, {
  $id: 'UserActivityPatch'
})
export type UserActivityPatch = Static<typeof userActivityPatchSchema>
export const userActivityPatchValidator = getValidator(userActivityPatchSchema, dataValidator)
export const userActivityPatchResolver = resolve<UserActivity, HookContext<UserActivityService>>({})

// Schema for allowed query properties
export const userActivityQueryProperties = Type.Pick(userActivitySchema, [
  '_id',
  'userId',
  'type',
  'description',
  'ipAddress',
  'acknowledged',
  'createdAt'
])
export const userActivityQuerySchema = Type.Intersect(
  [
    querySyntax(userActivityQueryProperties),
    // Add additional query properties here
    Type.Object(
      {
        adminView: Type.Optional(Type.Boolean()),
        'metadata.email': Type.Optional(Type.String())
      },
      { additionalProperties: false }
    )
  ],
  { additionalProperties: false }
)
export type UserActivityQuery = Static<typeof userActivityQuerySchema>
export const userActivityQueryValidator = getValidator(userActivityQuerySchema, queryValidator)
export const userActivityQueryResolver = resolve<UserActivityQuery, HookContext<UserActivityService>>({
  // Users can only see their own activities, unless they are admin
  userId: async (value, _user, context) => {
    // Check if admin override has already been applied
    if ((context.params as any).skipUserIdQuery) {
      return undefined
    }

    if (context.params.user) {
      const currentUser = context.params.user
      const isAdmin = currentUser.roles && currentUser.roles.includes(UserRole.ADMIN)

      // If user is admin, don't apply userId filter - they can see all activities
      if (isAdmin) {
        return undefined
      }

      // For non-admin users, explicitly filter to only activities with their userId
      // This will exclude failed logins and other activities without a userId
      return currentUser._id
    }

    return value
  }
})
