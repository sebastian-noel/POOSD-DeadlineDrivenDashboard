import type { ApiMilestone, ApiTask, MilestoneProgress } from './api';
import { dayOfMonth, daysUntil, dueLabel, formatShortDate, monthAbbrev } from './dates';
import { toUiTasks } from './dashboardModel';
import type { NextMilestone, PlannedTask } from '../types';

/** Derive progress from all loaded tasks, including milestones beyond the summary endpoint's limit. */
export function plannerProgress(milestones: ApiMilestone[], tasks: ApiTask[]): MilestoneProgress[] {
  const counts = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    const count = counts.get(task.milestoneId) ?? { total: 0, completed: 0 };
    count.total += 1;
    if (task.status === 'done') count.completed += 1;
    counts.set(task.milestoneId, count);
  }
  return milestones.map((m) => {
    const count = counts.get(m.id);
    const totalTasks = count?.total ?? 0;
    const completedTasks = count?.completed ?? 0;
    return { ...m, totalTasks, completedTasks, progressPercent: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0 };
  });
}

export function plannedTasks(tasks: ApiTask[], milestones: ApiMilestone[], now = new Date()): PlannedTask[] {
  const byId = new Map(milestones.map((m) => [m.id, m]));
  return tasks.map((task) => {
    const milestone = byId.get(task.milestoneId);
    // Undated, overdue and due-today tasks belong to the current work list.
    const upcoming = task.dueAt && daysUntil(task.dueAt, now) > 0;
    return {
      id: task.id, label: task.title, tag: milestone?.title ?? 'General',
      milestone: milestone?.title ?? 'General', done: task.status === 'done',
      milestoneDue: milestone?.dueAt ? formatShortDate(milestone.dueAt) : 'No due date',
      due: upcoming ? { iso: task.dueAt!, label: formatShortDate(task.dueAt!) } : undefined,
    };
  });
}

export function nextMilestone(progress: MilestoneProgress[], tasks: ApiTask[], now = new Date()): NextMilestone | null {
  const next = progress
    .filter((m) => m.dueAt && !(m.totalTasks > 0 && m.completedTasks === m.totalTasks))
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())[0];
  if (!next?.dueAt) return null;
  const days = daysUntil(next.dueAt, now);
  return {
    id: next.id, title: next.title, context: `${next.completedTasks} of ${next.totalTasks} tasks complete`,
    month: monthAbbrev(next.dueAt), day: dayOfMonth(next.dueAt),
    dueLabel: days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : dueLabel(days),
    urgent: days <= 1, dueDate: formatShortDate(next.dueAt),
    completedTasks: next.completedTasks, totalTasks: next.totalTasks,
    remainingTasks: toUiTasks(tasks.filter((t) => t.milestoneId === next.id && t.status !== 'done'), new Map([[next.id, next.title]])),
  };
}
