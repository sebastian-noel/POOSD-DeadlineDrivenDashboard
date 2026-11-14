import type { ApiFocusSession } from './api';
import type { TimerMode, UserSettings } from '../types';

export type FocusPlan = Pick<UserSettings, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakAfterSessions'>;

export function durationOf(mode: TimerMode, plan: FocusPlan): number {
  return 60 * (mode === 'focus' ? plan.focusMinutes : mode === 'short' ? plan.shortBreakMinutes : plan.longBreakMinutes);
}

export function formatTime(totalSeconds: number): string {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function completedSessions(sessions: ApiFocusSession[]): ApiFocusSession[] {
  return sessions.filter((session) => session.status === 'completed' && session.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
}
