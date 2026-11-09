import type { CalendarEvent, MilestoneStatus } from '../types';

/**
 * Sample content for the Calendar page, copied from the Figma mock-up.
 * Front-end design only: the API team will replace this with real data.
 * Tasks on the grid come from `sampleTasks`, so they match the Tasks page.
 */

/** The day the sample is written for: Tuesday, Oct 27, 2026, the same day as the Tasks page. */
export const SAMPLE_CALENDAR_TODAY = new Date(2026, 9, 27);

function milestone(id: string, title: string, date: string, status: MilestoneStatus, project: string): CalendarEvent {
  return { id, title, date, kind: 'milestone', status, project };
}

export const sampleCalendarMilestones: CalendarEvent[] = [
  milestone('cm1', 'Scope proposal', '2026-10-05', 'Completed', 'Thesis'),
  milestone('cm2', 'Review proposal outline', '2026-10-08', 'Completed', 'Thesis'),
  milestone('cm3', 'Research proposal', '2026-10-10', 'Completed', 'Thesis'),
  milestone('cm4', 'Collect sources', '2026-10-14', 'Completed', 'Thesis'),
  milestone('cm5', 'Source notes', '2026-10-19', 'Completed', 'Thesis'),
  milestone('cm6', 'Review feedback', '2026-10-23', 'Completed', 'Thesis'),
  milestone('cm7', 'Focus session', '2026-10-26', 'Completed', 'Thesis'),
  milestone('cm8', 'Literature review draft', '2026-10-28', 'At risk', 'Thesis'),
  milestone('cm9', 'Problem set 6', '2026-10-30', 'On track', 'Linear Algebra'),
  milestone('cm10', 'Sprint 4 demo slides', '2026-11-02', 'On track', 'Internship'),
  milestone('cm11', 'Enzyme kinetics lab report', '2026-11-05', 'On track', 'BIO 310'),
];
