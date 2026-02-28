// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import { ObjectIdSchema } from '@feathersjs/typebox'

// Main data model schema for Geotab authentication status
export const geotabSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    database: Type.String(),
    username: Type.String(), 
    sessionId: Type.Optional(Type.String()),
    isAuthenticated: Type.Boolean(),
    lastAuthenticated: Type.Optional(Type.String()),
    server: Type.Optional(Type.String()),
    authExpiry: Type.Optional(Type.String()),
    createdAt: Type.Number(),
    updatedAt: Type.Number()
  },
  { $id: 'Geotab', additionalProperties: false }
)
export type Geotab = Static<typeof geotabSchema>
export const geotabValidator = getValidator(geotabSchema, dataValidator)
export const geotabResolver = resolve<Geotab, HookContext>({})

export const geotabExternalResolver = resolve<Geotab, HookContext>({
  // Don't expose sensitive data in external responses
})

// Schema for authentication requests (includes password and optional session data)
export const geotabAuthSchema = Type.Object({
  database: Type.String(),
  username: Type.String(),
  password: Type.Optional(Type.String()), // Optional for session reuse
  sessionId: Type.Optional(Type.String()), // For reusing existing sessions
  server: Type.Optional(Type.String()) // For session reuse
}, {
  $id: 'GeotabAuth'
})
export type GeotabAuth = Static<typeof geotabAuthSchema>
export const geotabAuthValidator = getValidator(geotabAuthSchema, dataValidator)

// Schema for creating new entries
export const geotabDataSchema = Type.Pick(geotabSchema, [
  'database',
  'username',
  'sessionId',
  'isAuthenticated',
  'lastAuthenticated',
  'server',
  'authExpiry'
], {
  $id: 'GeotabData'
})
export type GeotabData = Static<typeof geotabDataSchema>
export const geotabDataValidator = getValidator(geotabDataSchema, dataValidator)
export const geotabDataResolver = resolve<Geotab, HookContext>({
  createdAt: async () => {
    return Date.now()
  },
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for updating entries
export const geotabPatchSchema = Type.Partial(geotabSchema, {
  $id: 'GeotabPatch'
})
export type GeotabPatch = Static<typeof geotabPatchSchema>
export const geotabPatchValidator = getValidator(geotabPatchSchema, dataValidator)
export const geotabPatchResolver = resolve<Geotab, HookContext>({
  updatedAt: async () => {
    return Date.now()
  }
})

// Schema for allowed query properties
export const geotabQueryProperties = Type.Pick(geotabSchema, [
  '_id',
  'database',
  'username',
  'sessionId',
  'isAuthenticated',
  'lastAuthenticated',
  'server',
  'authExpiry',
  'createdAt',
  'updatedAt'
])
export const geotabQuerySchema = Type.Intersect(
  [
    querySyntax(geotabQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type GeotabQuery = Static<typeof geotabQuerySchema>
export const geotabQueryValidator = getValidator(geotabQuerySchema, queryValidator)
export const geotabQueryResolver = resolve<GeotabQuery, HookContext>({})