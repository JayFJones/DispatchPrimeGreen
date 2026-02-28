import { resolve } from '@feathersjs/schema'
import { Type, getValidator } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator } from '../../validators'
import type { AdminService } from './admin.class'

// Admin action schema
export const adminActionSchema = Type.Object(
  {
    action: Type.String(),
    data: Type.Optional(Type.Any())
  },
  { $id: 'AdminActionSchema', additionalProperties: false }
)
export type AdminAction = Static<typeof adminActionSchema>
export const adminActionValidator = getValidator(adminActionSchema, dataValidator)
export const adminActionResolver = resolve<AdminAction, HookContext<AdminService>>({})

// Admin response schema
export const adminResponseSchema = Type.Object(
  {
    success: Type.Boolean(),
    message: Type.String(),
    data: Type.Optional(Type.Any())
  },
  { $id: 'AdminResponseSchema', additionalProperties: false }
)
export type AdminResponse = Static<typeof adminResponseSchema>
export const adminResponseResolver = resolve<AdminResponse, HookContext<AdminService>>({})
export const adminResponseExternalResolver = resolve<AdminResponse, HookContext<AdminService>>({})
