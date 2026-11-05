import type { CalendarView, FocusSessionLog, UserSettings, WeekStart } from '../types';

/** Pomodoro lengths used by the Focus timer page. Not connected to saved Settings yet. */
export const FOCUS_PLAN = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfterSessions: 4,
};

/** Placeholder rows for the Focus timer page until it reads sessions from the API. */
export const sampleRecentSessions: FocusSessionLog[] = [
  { id: 's1', title: 'Outline section 2.3', when: 'Today · 10:00 AM', minutes: 25 },
  { id: 's2', title: 'Read 2 assigned papers', when: 'Yesterday · 3:00 PM', minutes: 25 },
  { id: 's3', title: 'Answer Q1–Q3', when: 'Yesterday · 1:30 PM', minutes: 25 },
];

export const REMINDER_OPTIONS = ['1 hour before', '3 hours before', '1 day before', '2 days before', '1 week before'];

export const WEEK_START_OPTIONS: WeekStart[] = ['Sunday', 'Monday'];

export const CALENDAR_VIEW_OPTIONS: CalendarView[] = ['Month', 'Week', 'Day'];

export const TIME_ZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Phoenix', label: 'Mountain Time (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

/** Starting values for the Settings form; App fills in the signed-in user's name and email. */
export const defaultSettings: UserSettings = {
  displayName: '',
  email: '',
  deadlineReminders: true,
  remindBefore: '1 day before',
  dailySummary: false,
  ...FOCUS_PLAN,
  weekStartsOn: 'Sunday',
  defaultCalendarView: 'Month',
  timeZone: 'America/New_York',
};
