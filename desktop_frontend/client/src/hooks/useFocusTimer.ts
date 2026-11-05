import { useEffect, useState } from 'react';
import { FOCUS_PLAN } from '../data/preferences';
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

interface TimerState {
  mode: TimerMode;
  remaining: number;
  completedSessions: number;
}

/** One second passes. When a block ends, move straight to the next one: a break after focus, focus after a break. */
function tick(state: TimerState): TimerState {
  if (state.remaining > 1) return { ...state, remaining: state.remaining - 1 };
  if (state.mode === 'focus') {
    const done = state.completedSessions + 1;
    const next: TimerMode = done % FOCUS_PLAN.longBreakAfterSessions === 0 ? 'long' : 'short';
    return { mode: next, remaining: durationOf(next), completedSessions: done };
  }
  return { ...state, mode: 'focus', remaining: durationOf('focus') };
}

/**
 * Pomodoro timer logic: focus blocks, a short break after each, and a long break
 * after every `longBreakAfterSessions` focus blocks. Each component that calls this
 * gets its own timer; nothing is shared between pages yet.
 */
export function useFocusTimer() {
  const [state, setState] = useState<TimerState>(() => ({
    mode: 'focus',
    remaining: durationOf('focus'),
    completedSessions: 0,
  }));
  const [running, setRunning] = useState(false);

  const { mode, remaining, completedSessions } = state;
  const duration = durationOf(mode);
  const sessionsPerDay = FOCUS_PLAN.longBreakAfterSessions;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setState(tick), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const toggle = () => setRunning((r) => !r);

  const reset = () => {
    setRunning(false);
    setState((s) => ({ ...s, remaining: durationOf(s.mode) }));
  };

  /** Jump straight to a mode (the Focus / Short break / Long break tabs). */
  const selectMode = (next: TimerMode) => {
    setRunning(false);
    setState((s) => ({ ...s, mode: next, remaining: durationOf(next) }));
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
