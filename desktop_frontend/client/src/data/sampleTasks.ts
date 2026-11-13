import type { NewTaskInput } from '../hooks/useDashboardData';
import type { ApiMilestone } from '../lib/api';
import { formatShortDate } from '../lib/dates';
import type { PlannedTask } from '../types';

/**
 * Sample content for the Tasks page, copied from the Figma mock-up.
 * Front-end design only: the API team will replace this with real data.
 */

/** The day the sample is written for. */
export const SAMPLE_TODAY_LABEL = 'Tuesday, Oct 27';

/** Tasks finished earlier this week, before today ("12 tasks done" = these + today's). */
export const SAMPLE_DONE_EARLIER_THIS_WEEK = 9;

/** Milestones a new task can be filed under, with the project pill each one shows. */
export const SAMPLE_TASK_MILESTONES = [
  { id: 'lit-review', title: 'Literature review', tag: 'Thesis', due: 'Wed, Oct 28' },
  { id: 'pset-5', title: 'Problem set 5', tag: 'MATH 221', due: 'Fri, Oct 30' },
  { id: 'sprint-4', title: 'Internship sprint 4', tag: 'Internship', due: 'Mon, Nov 2' },
  { id: 'biochem', title: 'Biochem lab series', tag: 'BIO 310', due: 'Fri, Nov 20' },
];

/** The same milestones in the shape the New task form lists. */
export const SAMPLE_MODAL_MILESTONES: ApiMilestone[] = SAMPLE_TASK_MILESTONES.map((m) => ({
  id: m.id,
  title: m.title,
  description: '',
  dueAt: null,
}));

/** A task added through the New task form. Kept in the browser only. */
export function plannedTaskFromInput(input: NewTaskInput): PlannedTask {
  const milestone = SAMPLE_TASK_MILESTONES.find((m) => m.id === input.milestoneId);
  return {
    id: `new-${Date.now()}`,
    label: input.title,
    tag: milestone?.tag ?? input.newMilestoneTitle,
    done: false,
    milestone: milestone?.title ?? input.newMilestoneTitle,
    milestoneDue: milestone?.due ?? 'No due date',
    due: input.dueAt ? { label: formatShortDate(input.dueAt), iso: input.dueAt } : undefined,
  };
}

const [litReview, pset, sprint, biochem] = SAMPLE_TASK_MILESTONES;

/** `due` is [label, YYYY-MM-DD]; stored as the end of that local day, like dates picked in the New task form. */
function task(id: string, label: string, m: (typeof SAMPLE_TASK_MILESTONES)[number], done: boolean, due?: [string, string]): PlannedTask {
  return {
    id,
    label,
    tag: m.tag,
    done,
    milestone: m.title,
    milestoneDue: m.due,
    due: due && { label: due[0], iso: new Date(`${due[1]}T23:59:00`).toISOString() },
  };
}

export const sampleTasks: PlannedTask[] = [
  // Today
  task('t1', 'Summarize 4 sources', litReview, false),
  task('t2', 'Answer Q4–Q6', pset, false),
  task('t3', 'Draft demo storyline', sprint, false),
  task('t4', 'Outline section 2.3', litReview, true),
  task('t5', 'Read 2 assigned papers', litReview, true),
  task('t6', 'Answer Q1–Q3', pset, true),
  // Upcoming
  task('t7', 'Draft the synthesis', litReview, false, ['Oct 28', '2026-10-28']),
  task('t8', 'Check citations', litReview, false, ['Oct 28', '2026-10-28']),
  task('t9', 'Submit review draft', litReview, false, ['Oct 28', '2026-10-28']),
  task('t10', 'Check problem set answers', pset, false, ['Oct 30', '2026-10-30']),
  task('t11', 'Rehearse the sprint demo', sprint, false, ['Nov 2', '2026-11-02']),
  task('t12', 'Plot enzyme assay results', biochem, false, ['Nov 5', '2026-11-05']),
];
