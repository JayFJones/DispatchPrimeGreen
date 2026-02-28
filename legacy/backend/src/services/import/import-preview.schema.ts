import { resolve } from '@feathersjs/schema'
import { Type, getValidator } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator } from '../../validators'
import type { ImportPreviewService } from './import-preview.class'

// Schema for import preview requests
export const importPreviewDataSchema = Type.Object(
  {
    fileData: Type.String(), // Base64 encoded file data
    fileName: Type.String(),
    importType: Type.String()
  },
  { $id: 'ImportPreviewData' }
)
export type ImportPreviewData = Static<typeof importPreviewDataSchema>
export const importPreviewDataValidator = getValidator(importPreviewDataSchema, dataValidator)

// Schema for worksheet information
export const worksheetInfoSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  icon: Type.String(),
  found: Type.Boolean(),
  rowCount: Type.Number(),
  validHeaders: Type.Boolean(),
  headerErrors: Type.Array(Type.String()),
  missingHeaders: Type.Array(Type.String()),
  extraHeaders: Type.Array(Type.String())
})

// Schema for worksheet summary
export const worksheetSummarySchema = Type.Object({
  totalSheets: Type.Number(),
  worksheets: Type.Array(worksheetInfoSchema),
  warnings: Type.Array(Type.String())
})

// Schema for import summary (for lanter-endpoints)
export const importSummarySchema = Type.Object({
  totalRows: Type.Number(),
  terminals: Type.Object({
    count: Type.Number(),
    icon: Type.String(),
    description: Type.String()
  }),
  customers: Type.Object({
    count: Type.Number(),
    icon: Type.String(),
    description: Type.String()
  }),
  routes: Type.Object({
    count: Type.Number(),
    icon: Type.String(),
    description: Type.String()
  }),
  routeStops: Type.Object({
    count: Type.Number(),
    icon: Type.String(),
    description: Type.String()
  }),
  warnings: Type.Array(Type.String())
})

// Schema for import preview response
export const importPreviewSchema = Type.Object(
  {
    _id: Type.String(),
    success: Type.Boolean(),
    totalRows: Type.Number(),
    data: Type.Array(Type.Object({}, { additionalProperties: true })),
    worksheetSummary: Type.Optional(worksheetSummarySchema),
    importSummary: Type.Optional(importSummarySchema),
    warnings: Type.Optional(Type.Array(Type.String())),
    createdAt: Type.String({ format: 'date-time' })
  },
  { $id: 'ImportPreview', additionalProperties: false }
)
export type ImportPreview = Static<typeof importPreviewSchema>
export const importPreviewValidator = getValidator(importPreviewSchema, dataValidator)
export const importPreviewResolver = resolve<ImportPreview, HookContext<ImportPreviewService>>({})

export const importPreviewExternalResolver = resolve<ImportPreview, HookContext<ImportPreviewService>>({})

export const importPreviewDataResolver = resolve<ImportPreview, HookContext<ImportPreviewService>>({
  _id: async () => new Date().getTime().toString(),
  createdAt: async () => new Date().toISOString()
})
