import type { Milestone, NextMilestone } from '../types';

/**
 * Sample content for the Milestones page, copied from the Figma mock-up.
 * Front-end design only: the API team will replace this with real data.
 */
export const sampleMilestones: Milestone[] = [
  { id: 'm1', title: 'Literature review', status: 'At risk', detail: 'Due Oct 28 · 6 of 10 tasks', percent: 60 },
  { id: 'm2', title: 'Internship sprint 4', status: 'On track', detail: 'Due Nov 2 · 5 of 11 tasks', percent: 45 },
  { id: 'm3', title: 'Thesis chapter 3', status: 'On track', detail: 'Due Nov 12 · 0 of 6 tasks', percent: 0 },
  { id: 'm4', title: 'Biochem lab series', status: 'On track', detail: 'Due Nov 20 · 2 of 8 tasks', percent: 25 },
  { id: 'm5', title: 'Research proposal', status: 'Completed', detail: 'Finished Oct 10 · 8 of 8 tasks', percent: 100 },
];

export const sampleNextMilestone: NextMilestone = {
  id: 'm1',
  title: 'Literature review',
  context: 'Thesis · Milestone 2 of 5',
  month: 'OCT',
  day: 28,
  dueLabel: 'Due tomorrow',
  urgent: true,
  dueDate: 'Wed, Oct 28',
  completedTasks: 6,
  totalTasks: 10,
  remainingTasks: [
    { id: 't1', label: 'Summarize 4 sources', tag: 'Thesis', context: '', done: false },
    { id: 't2', label: 'Draft the synthesis', tag: 'Thesis', context: '', done: false },
    { id: 't3', label: 'Check citations', tag: 'Thesis', context: '', done: false },
    { id: 't4', label: 'Submit review draft', tag: 'Thesis', context: '', done: false },
  ],
};
