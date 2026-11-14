import { z } from 'zod'

/** Account preferences. Defaults also cover accounts created before settings were introduced. */
export const settingsInputSchema = z.object({
  deadlineReminders: z.boolean(),
  remindBefore: z.enum(['1 hour before', '3 hours before', '1 day before', '2 days before', '1 week before']),
  dailySummary: z.boolean(),
  focusMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  longBreakAfterSessions: z.number().int().min(1).max(12),
  weekStartsOn: z.enum(['Sunday', 'Monday']),
  defaultCalendarView: z.enum(['Month', 'Week', 'Day']),
  timeZone: z.enum(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu', 'UTC']),
}).strict()

export type AccountSettings = z.infer<typeof settingsInputSchema>

export const SETTINGS_DEFAULTS: AccountSettings = {
  deadlineReminders: true,
  remindBefore: '1 day before',
  dailySummary: false,
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfterSessions: 4,
  weekStartsOn: 'Sunday',
  defaultCalendarView: 'Month',
  timeZone: 'America/New_York',
}

export function accountSummary(user: { _id: { toString(): string }; email: string; displayName: string; settings?: AccountSettings }) {
  const preferences = Object.fromEntries(Object.keys(SETTINGS_DEFAULTS).map((key) => [
    key, user.settings?.[key as keyof AccountSettings] ?? SETTINGS_DEFAULTS[key as keyof AccountSettings],
  ]))
  return { id: user._id.toString(), email: user.email, displayName: user.displayName, settings: settingsInputSchema.parse(preferences) }
}
