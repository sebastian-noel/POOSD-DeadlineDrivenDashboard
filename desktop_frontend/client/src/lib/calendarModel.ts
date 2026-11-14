import type { ApiMilestone, ApiTask, MilestoneProgress } from './api';
import { milestoneStatus } from './dashboardModel';
import { toDateKey } from './dates';
import type { CalendarEvent } from '../types';

/** Keep actual due dates, including overdue tasks. Only undated tasks are planned for today. */
export function toCalendarEvents(
  tasks: ApiTask[],
  milestones: ApiMilestone[],
  progress: MilestoneProgress[],
  today: Date,
): CalendarEvent[] {
  const titles = new Map(milestones.map((m) => [m.id, m.title]));
  const progressById = new Map(progress.map((m) => [m.id, m]));
  const events: CalendarEvent[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    date: toDateKey(task.dueAt ? new Date(task.dueAt) : today),
    kind: 'task',
    done: task.status === 'done',
    project: titles.get(task.milestoneId) ?? 'General',
  }));
  for (const milestone of milestones) {
    // An undated milestone has no position in the calendar; it remains on Milestones.
    if (!milestone.dueAt) continue;
    const summary = progressById.get(milestone.id);
    events.push({
      id: milestone.id,
      title: milestone.title,
      date: toDateKey(new Date(milestone.dueAt)),
      kind: 'milestone',
      status: summary ? milestoneStatus(summary) : 'On track',
      project: milestone.description || 'Milestone',
    });
  }
  return events;
}
