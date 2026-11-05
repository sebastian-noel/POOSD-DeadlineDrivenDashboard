import { useEffect, useState } from 'react';
import { FOCUS_PLAN } from '../data/mockData';
import type { TimerMode } from '../types';

export function durationOf(mode: TimerMode): number {
  const minutes =
    mode === 'focus'
      ? FOCUS_PLAN.focusMinutes
      : mode === 'short'
        ? FOCUS_PLAN.shortBreakMinutes
        : FOCUS_PLAN.longBreakMinutes;
  return minutes * 60;
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Pomodoro timer logic: focus blocks, a short break after each, and a long break
 * after every `longBreakAfterSessions` focus blocks. Each component that calls this
 * gets its own timer; nothing is shared between pages yet.
 */
export function useFocusTimer() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [remaining, setRemaining] = useState(() => durationOf('focus'));
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const duration = durationOf(mode);
  const sessionsPerDay = FOCUS_PLAN.longBreakAfterSessions;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining > 0) return;
    if (mode === 'focus') {
      const done = completedSessions + 1;
      const next: TimerMode = done % FOCUS_PLAN.longBreakAfterSessions === 0 ? 'long' : 'short';
      setCompletedSessions(done);
      setMode(next);
      setRemaining(durationOf(next));
    } else {
      setMode('focus');
      setRemaining(durationOf('focus'));
    }
  }, [remaining, mode, completedSessions]);

  const toggle = () => setRunning((r) => !r);

  const reset = () => {
    setRunning(false);
    setRemaining(duration);
  };

  /** Jump straight to a mode (the Focus / Short break / Long break tabs). */
  const selectMode = (next: TimerMode) => {
    setRunning(false);
    setMode(next);
    setRemaining(durationOf(next));
  };

  const sessionLabel =
    completedSessions >= sessionsPerDay
      ? `All ${sessionsPerDay} sessions done`
      : `Session ${completedSessions + 1} of ${sessionsPerDay} today`;

  return {
    mode,
    remaining,
    duration,
    running,
    started: remaining < duration,
    completedSessions: Math.min(completedSessions, sessionsPerDay),
    sessionsPerDay,
    sessionLabel,
    toggle,
    reset,
    selectMode,
  };
}
