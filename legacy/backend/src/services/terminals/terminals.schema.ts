// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { TerminalService } from './terminals.class'

// Main data model schema
export const terminalSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    name: Type.String(), // terminal name from HUB field (e.g., "CHICAGO DOCK")
    agent: Type.Optional(Type.String()), // full agent field (e.g., "TOMASEK-CHICAGO")
    dcp: Type.Optional(Type.String()), // DCP code (e.g., "PACE") - deprecated, use agent field
    cName: Type.Optional(Type.String()), // URL-compliant name (e.g., "BESSEMER-AL")
    city: Type.Optional(Type.String()), // parsed from HUB
    state: Type.Optional(Type.String()), // parsed from HUB
    group: Type.Optional(Type.String()), // Geotab group ID (if present, this is a terminal; if not, it's a hub)
    terminalType: Type.Optional(Type.Union([Type.Literal('terminal'), Type.Literal('hub')], { default: 'hub' })), // 'terminal' if has group, 'hub' otherwise
    streetAddress: Type.Optional(Type.String()), // Street Address
    streetAddress2: Type.Optional(Type.String()), // Street Address 2
    zip: Type.Optional(Type.String()), // Zip code
    country: Type.Optional(Type.String()), // Country
    worklist: Type.Optional(Type.String()), // Worklist
    latitude: Type.Optional(Type.Number()), // Latitude
    longitude: Type.Optional(Type.Number()), // Longitude
    timeZone: Type.Optional(Type.String()), // from Time Zone field
    bench: Type.Optional(Type.Array(Type.String())), // Array of driver IDs for bench drivers
    leaders: Type.Optional(Type.Array(Type.Object({
      name: Type.String(), // Full name (First Last)
      title: Type.String() // Position/title
    }))), // Array of terminal leaders with name and title
    createdAt: Type.Optional(Type.String({ format: 'date-time' })),
    updatedAt: Type.Optional(Type.String({ format: 'date-time' }))
  },
  { $id: 'Terminal', additionalProperties: false }
)
export type Terminal = Static<typeof terminalSchema>
export const terminalValidator = getValidator(terminalSchema, dataValidator)
export const terminalResolver = resolve<Terminal, HookContext<TerminalService>>({})

export const terminalExternalResolver = resolve<Terminal, HookContext<TerminalService>>({})

// Schema for creating new entries
export const terminalDataSchema = Type.Pick(
  terminalSchema,
  [
    'name',
    'agent',
    'dcp',
    'cName',
    'city',
    'state',
    'group',
    'terminalType',
    'streetAddress',
    'streetAddress2',
    'zip',
    'country',
    'worklist',
    'latitude',
    'longitude',
    'timeZone',
    'bench',
    'leaders'
  ],
  {
    $id: 'TerminalData'
  }
)
export type TerminalData = Static<typeof terminalDataSchema>
export const terminalDataValidator = getValidator(terminalDataSchema, dataValidator)
export const terminalDataResolver = resolve<Terminal, HookContext<TerminalService>>({
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString()
})

// Schema for updating existing entries
export const terminalPatchSchema = Type.Partial(terminalSchema, {
  $id: 'TerminalPatch'
})
export type TerminalPatch = Static<typeof terminalPatchSchema>
export const terminalPatchValidator = getValidator(terminalPatchSchema, dataValidator)
export const terminalPatchResolver = resolve<Terminal, HookContext<TerminalService>>({
  updatedAt: async () => new Date().toISOString()
})

// Schema for allowed query properties
export const terminalQueryProperties = Type.Pick(terminalSchema, [
  '_id',
  'name',
  'agent',
  'dcp',
  'cName',
  'city',
  'state',
  'group',
  'terminalType',
  'streetAddress',
  'streetAddress2',
  'zip',
  'country',
  'worklist',
  'latitude',
  'longitude',
  'timeZone',
  'bench',
  'leaders',
  'createdAt',
  'updatedAt'
])
export const terminalQuerySchema = Type.Intersect(
  [
    querySyntax(terminalQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type TerminalQuery = Static<typeof terminalQuerySchema>
export const terminalQueryValidator = getValidator(terminalQuerySchema, queryValidator)
export const terminalQueryResolver = resolve<TerminalQuery, HookContext<TerminalService>>({})
