export type Page = 'Dashboard' | 'Milestones' | 'Tasks' | 'Focus timer' | 'Calendar' | 'Settings';

export type DeadlineRange = 'week' | 'three-weeks' | 'all';

export type HomePage = 'Home' | 'About Us' | 'FAQ' | 'Privacy Policy & ToS' | 'Contact';

export type PublicView = HomePage | 'Login' | 'SignUp' | 'ForgotPassword' | 'ResetPassword';

export interface Deadline {
  id: string;
  title: string;
  context: string;
  month: string;
  day: number;
  daysUntil: number;
  progress: string;
}

export type MilestoneStatus = 'Completed' | 'At risk' | 'On track';

export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  detail: string;
  percent: number;
}

export interface Task {
  id: string;
  label: string;
  tag: string;
  context: string;
  done: boolean;
}

export interface Notification {
  id: string;
  text: string;
  time: string;
}

export type TimerMode = 'focus' | 'short' | 'long';

export interface FocusSessionLog {
  id: string;
  title: string;
  when: string;
  minutes: number;
}

export type WeekStart = 'Sunday' | 'Monday';
export type CalendarView = 'Month' | 'Week' | 'Day';

export interface UserSettings {
  displayName: string;
  email: string;
  deadlineReminders: boolean;
  remindBefore: string;
  dailySummary: boolean;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakAfterSessions: number;
  weekStartsOn: WeekStart;
  defaultCalendarView: CalendarView;
  /** IANA time zone id, e.g. "America/New_York". */
  timeZone: string;
}
