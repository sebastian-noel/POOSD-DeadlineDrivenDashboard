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

/** A task on the Tasks page. Today's tasks have no due date shown; upcoming ones do. */
export interface PlannedTask {
  id: string;
  label: string;
  /** Project or course pill, e.g. "Thesis" or "MATH 221". */
  tag: string;
  done: boolean;
  milestone: string;
  /** e.g. "Wed, Oct 28" */
  milestoneDue: string;
  /** Upcoming tasks only: the date shown ("Oct 28") and an ISO date to sort by. */
  due?: { label: string; iso: string };
}

/** What the Next due card on the Milestones page shows. */
export interface NextMilestone {
  id: string;
  title: string;
  /** e.g. "Thesis · Milestone 2 of 5" */
  context: string;
  /** Date circle, e.g. "OCT" and 28. */
  month: string;
  day: number;
  /** Badge text, e.g. "Due tomorrow"; `urgent` draws it red. */
  dueLabel: string;
  urgent: boolean;
  /** e.g. "Wed, Oct 28" */
  dueDate: string;
  completedTasks: number;
  totalTasks: number;
  remainingTasks: Task[];
}

interface CalendarEventBase {
  id: string;
  title: string;
  /** Local due date as YYYY-MM-DD. */
  date: string;
  /** Project or course, e.g. "Thesis". */
  project: string;
}

/** One item on the Calendar page: a task (open ones listed, done ones counted) or a milestone (chip in its status color). */
export type CalendarEvent =
  | (CalendarEventBase & { kind: 'task'; done: boolean })
  | (CalendarEventBase & { kind: 'milestone'; status: MilestoneStatus });

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
