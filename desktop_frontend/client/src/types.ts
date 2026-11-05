export type Page = 'Dashboard' | 'Milestones' | 'Tasks' | 'Focus timer' | 'Calendar' | 'Settings';

export type DeadlineRange = 'week' | 'three-weeks' | 'all';

export type HomePage =
  | 'Home' 
  | 'About Us' 
  | 'FAQ' 
  | 'Privacy Policy' 
  | 'Contact';

export type PublicView = HomePage | 'Login' | 'SignUp' | 'ForgotPassword';
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
