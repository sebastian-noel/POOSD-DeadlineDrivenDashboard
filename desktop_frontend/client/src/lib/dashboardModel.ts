/**
 * Turns API records into the view models the dashboard cards were designed around
 * (types.ts: Task, Deadline, Milestone, Notification).
 */
import type { ApiMilestone, ApiTask, DashboardSummary, MilestoneProgress } from './api';
import { dayOfMonth, daysUntil, formatMinutes, formatShortDate, monthAbbrev } from './dates';
import type { Deadline, Milestone, MilestoneStatus, Notification, Task } from '../types';

/** Deadline rows that come from a milestone (rather than a task) carry this id prefix. */
export const MILESTONE_DEADLINE_PREFIX = 'milestone:';

export function milestoneTitles(milestones: ApiMilestone[]): Map<string, string> {
  return new Map(milestones.map((m) => [m.id, m.title]));
}

export function toUiTasks(tasks: ApiTask[], titles: Map<string, string>): Task[] {
  return tasks.map((task) => {
    const tag = titles.get(task.milestoneId) ?? 'General';
    const due = task.dueAt ? ` · due ${formatShortDate(task.dueAt)}` : '';
    return { id: task.id, label: task.title, tag, context: `${tag}${due}`, done: task.status === 'done' };
  });
}

const STATUS_PROGRESS: Record<ApiTask['status'], string> = {
  todo: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

/** Open tasks and unfinished milestones that have a due date, soonest first. */
export function toDeadlines(tasks: ApiTask[], progress: MilestoneProgress[], titles: Map<string, string>): Deadline[] {
  const rows: { at: number; deadline: Deadline }[] = [];
  for (const task of tasks) {
    if (!task.dueAt || task.status === 'done') continue;
    rows.push({
      at: new Date(task.dueAt).getTime(),
      deadline: {
        id: task.id,
        title: task.title,
        context: titles.get(task.milestoneId) ?? 'Task',
        month: monthAbbrev(task.dueAt),
        day: dayOfMonth(task.dueAt),
        daysUntil: daysUntil(task.dueAt),
        progress: STATUS_PROGRESS[task.status],
      },
    });
  }
  for (const m of progress) {
    if (!m.dueAt || (m.totalTasks > 0 && m.completedTasks === m.totalTasks)) continue;
    rows.push({
      at: new Date(m.dueAt).getTime(),
      deadline: {
        id: `${MILESTONE_DEADLINE_PREFIX}${m.id}`,
        title: m.title,
        context: `Milestone · ${m.completedTasks} of ${m.totalTasks} tasks`,
        month: monthAbbrev(m.dueAt),
        day: dayOfMonth(m.dueAt),
        daysUntil: daysUntil(m.dueAt),
        progress: m.totalTasks ? `${m.progressPercent}% done` : 'Not started',
      },
    });
  }
  return rows.sort((a, b) => a.at - b.at).map((row) => row.deadline);
}

export function milestoneStatus(m: MilestoneProgress): MilestoneStatus {
  if (m.totalTasks > 0 && m.completedTasks === m.totalTasks) return 'Completed';
  if (m.dueAt) {
    const days = daysUntil(m.dueAt);
    if (days < 0 || (days <= 3 && m.progressPercent < 100)) return 'At risk';
  }
  return 'On track';
}

export function toUiMilestones(progress: MilestoneProgress[]): Milestone[] {
  return progress.map((m) => {
    const status = milestoneStatus(m);
    const when = status === 'Completed' ? 'Finished' : m.dueAt ? `Due ${formatShortDate(m.dueAt)}` : 'No due date';
    return { id: m.id, title: m.title, status, detail: `${when} · ${m.completedTasks} of ${m.totalTasks} tasks`, percent: m.progressPercent };
  });
}

export interface DashboardStats {
  dueThisWeek: number;
  dueThisWeekNote: string;
  milestonesOnTrack: string;
  milestonesNote: string;
  focusTime: string;
  focusNote: string;
  doneThisWeek: number;
  doneNote: string;
}

export function buildStats(tasks: ApiTask[], milestones: Milestone[], summary: DashboardSummary): DashboardStats {
  const open = tasks.flatMap((t) => (t.status !== 'done' && t.dueAt ? [daysUntil(t.dueAt)] : []));
  const dueThisWeek = open.filter((days) => days <= 7).length;
  const overdue = open.filter((days) => days < 0).length;
  const tomorrow = open.filter((days) => days === 1).length;
  const atRisk = milestones.filter((m) => m.status === 'At risk').length;
  const focusDiff = summary.focusMinutesLast7Days - summary.focusMinutesPrevious7Days;
  const doneDiff = summary.tasks.completedLast7Days - summary.tasks.completedPrevious7Days;
  return {
    dueThisWeek,
    dueThisWeekNote: overdue > 0 ? `${overdue} overdue` : tomorrow > 0 ? `${tomorrow} due tomorrow` : 'Nothing due tomorrow',
    milestonesOnTrack: `${milestones.length - atRisk} of ${milestones.length}`,
    milestonesNote: atRisk === 0 ? 'No milestones at risk' : `${atRisk} milestone${atRisk === 1 ? '' : 's'} at risk`,
    focusTime: formatMinutes(summary.focusMinutesLast7Days),
    focusNote: `${focusDiff >= 0 ? '+' : '-'}${formatMinutes(Math.abs(focusDiff))} vs last week`,
    doneThisWeek: summary.tasks.completedLast7Days,
    doneNote: `${Math.abs(doneDiff)} ${doneDiff >= 0 ? 'more' : 'fewer'} than last week`,
  };
}

export function buildNotifications(deadlines: Deadline[], milestones: Milestone[]): Notification[] {
  const items: Notification[] = [];
  for (const d of deadlines) {
    if (d.daysUntil < 0) {
      const ago = -d.daysUntil;
      items.push({ id: `overdue-${d.id}`, text: `${d.title} is overdue`, time: `${ago} day${ago === 1 ? '' : 's'} ago` });
    } else if (d.daysUntil === 0) {
      items.push({ id: `today-${d.id}`, text: `${d.title} is due today`, time: 'Today' });
    } else if (d.daysUntil === 1) {
      items.push({ id: `tomorrow-${d.id}`, text: `${d.title} is due tomorrow`, time: 'Tomorrow' });
    }
  }
  for (const m of milestones) {
    if (m.status === 'At risk') items.push({ id: `risk-${m.id}`, text: `${m.title} milestone is at risk`, time: 'Now' });
  }
  if (items.length === 0) items.push({ id: 'caught-up', text: 'You’re all caught up', time: 'Now' });
  return items.slice(0, 6);
}
