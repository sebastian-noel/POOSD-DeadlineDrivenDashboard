import type { Deadline, Milestone, Notification, Task } from '../types';

export const USER_NAME = 'User';
export const TODAY_LABEL = 'Tuesday, October 27';

export const deadlines: Deadline[] = [
  { id: 'd1', title: 'Literature review draft', context: 'Thesis · Milestone 2 of 5', month: 'OCT', day: 28, daysUntil: 1, progress: '60% done' },
  { id: 'd2', title: 'Problem set 6', context: 'Linear Algebra · MATH 221', month: 'OCT', day: 30, daysUntil: 3, progress: '30% done' },
  { id: 'd3', title: 'Sprint 4 demo slides', context: 'Internship · Product team', month: 'NOV', day: 2, daysUntil: 6, progress: '10% done' },
  { id: 'd4', title: 'Enzyme kinetics lab report', context: 'Biochemistry · BIO 310', month: 'NOV', day: 5, daysUntil: 9, progress: 'Not started' },
  { id: 'd5', title: 'Thesis chapter 3', context: 'Thesis · Milestone 3 of 5', month: 'NOV', day: 12, daysUntil: 16, progress: 'Not started' },
  { id: 'd6', title: 'Sprint 4 retro notes', context: 'Internship · Product team', month: 'NOV', day: 16, daysUntil: 20, progress: 'Not started' },
  { id: 'd7', title: 'Biochem lab series wrap-up', context: 'Biochemistry · BIO 310', month: 'NOV', day: 20, daysUntil: 24, progress: 'Not started' },
  { id: 'd8', title: 'Final thesis presentation', context: 'Thesis · Milestone 5 of 5', month: 'DEC', day: 4, daysUntil: 38, progress: 'Not started' },
];

export const milestones: Milestone[] = [
  { id: 'm1', title: 'Research proposal', status: 'Completed', detail: 'Finished Oct 10 · 8 of 8 tasks', percent: 100 },
  { id: 'm2', title: 'Literature review', status: 'At risk', detail: 'Due Oct 28 · 6 of 10 tasks', percent: 60 },
  { id: 'm3', title: 'Internship sprint 4', status: 'On track', detail: 'Due Nov 2 · 5 of 11 tasks', percent: 45 },
  { id: 'm4', title: 'Biochem lab series', status: 'On track', detail: 'Due Nov 20 · 2 of 8 tasks', percent: 25 },
];

export const initialTasks: Task[] = [
  { id: 't1', label: 'Outline section 2.3', tag: 'Thesis', context: 'Thesis chapter 3', done: true },
  { id: 't2', label: 'Read 2 assigned papers', tag: 'Thesis', context: 'Literature review', done: true },
  { id: 't3', label: 'Answer Q1–Q3', tag: 'MATH 221', context: 'Problem set 6', done: true },
  { id: 't4', label: 'Summarize 4 sources', tag: 'Thesis', context: 'Literature review · due tomorrow', done: false },
  { id: 't5', label: 'Draft demo storyline', tag: 'Internship', context: 'Sprint 4 demo slides · due Nov 2', done: false },
  { id: 't6', label: 'Answer Q4–Q6', tag: 'MATH 221', context: 'Problem set 6 · due Oct 30', done: false },
];

export const TASK_TAGS = ['Thesis', 'MATH 221', 'Internship', 'BIO 310'];

export const notifications: Notification[] = [
  { id: 'n1', text: 'Literature review draft is due tomorrow', time: '2h ago' },
  { id: 'n2', text: 'Literature review milestone is at risk', time: '5h ago' },
  { id: 'n3', text: 'You finished 4 more tasks than last week', time: 'Yesterday' },
];

/** Tasks completed earlier this week, before today's list. */
export const TASKS_DONE_BEFORE_TODAY = 9;
