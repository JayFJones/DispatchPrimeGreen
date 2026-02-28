import { z } from 'zod';
import { uuidSchema, timestampFields } from './common.js';

/** Full holiday_calendar row — terminal-specific non-operating days */
export const HolidayCalendarSchema = z.object({
  id: uuidSchema,
  terminalId: uuidSchema,
  date: z.string(),
  name: z.string().min(1),
  ...timestampFields,
});

/** Fields required when creating a holiday */
export const HolidayCalendarCreateSchema = HolidayCalendarSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/** Fields that can be updated on a holiday */
export const HolidayCalendarUpdateSchema = HolidayCalendarCreateSchema.omit({
  terminalId: true,
}).partial();

export type HolidayCalendar = z.infer<typeof HolidayCalendarSchema>;
export type HolidayCalendarCreate = z.infer<typeof HolidayCalendarCreateSchema>;
export type HolidayCalendarUpdate = z.infer<typeof HolidayCalendarUpdateSchema>;
