import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, focusApi, type ApiFocusSession } from '../lib/api';
import { completedSessions, durationOf, type FocusPlan } from '../lib/focusTimerModel';
import { toDateKey } from '../lib/dates';
import { useToday } from './useToday';
import type { TimerMode } from '../types';

interface TimerState {
  mode: TimerMode;
  status: 'ready' | 'running' | 'paused';
  duration: number;
  remaining: number;
  endsAt: number | null;
  session: ApiFocusSession | null;
}

function ready(mode: TimerMode = 'focus'): TimerState {
  return { mode, status: 'ready', duration: 0, remaining: 0, endsAt: null, session: null };
}

interface FocusTimerOptions {
  plan: FocusPlan;
  currentTaskId: string | null;
  onSessionExpired: () => void;
  onSessionComplete: () => Promise<void>;
}

/** One API-backed controller, mounted above both timer views for the signed-in user's lifetime. */
export function useFocusTimer({ plan, currentTaskId, onSessionExpired, onSessionComplete }: FocusTimerOptions) {
  const [state, setState] = useState<TimerState>(() => ready());
  const stateRef = useRef(state);
  const mounted = useRef(false);
  const locked = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ApiFocusSession[]>([]);
  const today = useToday();

  const apply = useCallback((next: TimerState) => {
    if (!mounted.current) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const adopt = useCallback((session: ApiFocusSession) => {
    const remaining = Math.max(0, session.targetSeconds - session.elapsedSeconds);
    apply({
      mode: 'focus', status: session.status === 'running' ? 'running' : 'paused',
      duration: session.targetSeconds, remaining, session,
      endsAt: session.status === 'running' ? Date.now() + remaining * 1000 : null,
    });
  }, [apply]);

  const report = useCallback((error: unknown) => {
    if (!mounted.current) return;
    if (error instanceof ApiError && error.status === 401) onSessionExpired();
    else setSyncError(error instanceof Error ? error.message : 'Could not sync the focus timer');
  }, [onSessionExpired]);

  const acceptSnapshot = useCallback((active: ApiFocusSession | null, history: ApiFocusSession[]) => {
    if (!mounted.current) return;
    setSessions(history);
    if (active) adopt(active);
    else if (stateRef.current.session) apply(ready());
    setLoaded(true);
  }, [adopt, apply]);

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    Promise.all([focusApi.active(), focusApi.listAll()])
      .then(([{ session }, history]) => {
        if (!cancelled) acceptSnapshot(session, history);
      })
      .catch((error: unknown) => { if (!cancelled) report(error); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; mounted.current = false; };
  }, [acceptSnapshot, report]);

  const synchronize = useCallback(async () => {
    const [{ session }, history] = await Promise.all([focusApi.active(), focusApi.listAll()]);
    acceptSnapshot(session, history);
    if (mounted.current) await onSessionComplete();
  }, [acceptSnapshot, onSessionComplete]);

  // Lock immediately, before React rerenders, so double clicks cannot create duplicate sessions.
  const run = useCallback(async (action: () => Promise<void>) => {
    if (locked.current || loading) return;
    locked.current = true;
    setBusy(true);
    try {
      await action();
      if (mounted.current) setSyncError(null);
    } catch (error) {
      const current = stateRef.current;
      // An expired focus block stays retryable instead of repeatedly failing every timer tick.
      if (current.session && current.remaining === 0) apply({ ...current, status: 'paused', endsAt: null });
      report(error);
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [loading, apply, report]);

  const done = completedSessions(sessions);
  const doneToday = done.filter((session) => toDateKey(new Date(session.completedAt!)) === toDateKey(today)).length;

  const finish = useCallback(async () => {
    const current = stateRef.current;
    if (current.mode !== 'focus') {
      apply(ready());
      return;
    }
    if (!current.session) return;
    let saved: ApiFocusSession;
    try {
      saved = await focusApi.act(current.session.id, 'complete');
    } catch (error) {
      // A second device may have completed/cancelled this session already.
      if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
        await synchronize();
        return;
      }
      throw error;
    }
    if (!mounted.current) return;
    setSessions((previous) => [saved, ...previous.filter((session) => session.id !== saved.id)]);
    const mode = (doneToday + 1) % plan.longBreakAfterSessions === 0 ? 'long' : 'short';
    const duration = durationOf(mode, plan);
    apply({ mode, duration, remaining: duration, endsAt: Date.now() + duration * 1000, session: null, status: 'running' });
    await onSessionComplete();
  }, [apply, doneToday, plan, onSessionComplete, synchronize]);

  // Use a deadline rather than counting interval callbacks: background tabs throttle callbacks.
  useEffect(() => {
    if (state.status !== 'running') return;
    const tick = () => {
      const current = stateRef.current;
      if (current.status !== 'running' || current.endsAt === null) return;
      const remaining = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
      if (remaining !== current.remaining) apply({ ...current, remaining });
      if (remaining === 0) void run(finish);
    };
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [state.status, apply, run, finish]);

  // Reconcile sessions changed on another device when returning to this app.
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void run(synchronize);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [run, synchronize]);

  const toggle = () => run(async () => {
    const current = stateRef.current;
    if (current.mode !== 'focus') {
      const remaining = current.status === 'ready' ? durationOf(current.mode, plan) : current.remaining;
      apply({ ...current, duration: current.status === 'ready' ? remaining : current.duration, remaining,
        status: current.status === 'running' ? 'paused' : 'running',
        endsAt: current.status === 'running' ? null : Date.now() + remaining * 1000 });
      return;
    }
    if (current.session && current.remaining === 0) {
      await finish();
      return;
    }
    if (current.session) {
      adopt(await focusApi.act(current.session.id, current.status === 'running' ? 'pause' : 'resume'));
      return;
    }
    try {
      adopt(await focusApi.start({ taskId: currentTaskId, targetSeconds: durationOf('focus', plan) }));
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) throw error;
      const { session } = await focusApi.active();
      if (!session) throw error;
      adopt(session.status === 'paused' ? await focusApi.act(session.id, 'resume') : session);
    }
  });

  const selectMode = (mode: TimerMode) => run(async () => {
    const current = stateRef.current;
    if (current.session) await focusApi.act(current.session.id, 'cancel');
    apply(ready(mode));
  });

  const retry = () => run(async () => {
    const current = stateRef.current;
    if (current.session && current.remaining === 0) await finish();
    else await synchronize();
  });

  return {
    mode: state.mode,
    running: state.status === 'running',
    started: state.status !== 'ready',
    duration: state.status === 'ready' ? durationOf(state.mode, plan) : state.duration,
    remaining: state.status === 'ready' ? durationOf(state.mode, plan) : state.remaining,
    taskId: state.session?.taskId ?? null,
    hasSession: state.session !== null,
    completedSessions: Math.min(plan.longBreakAfterSessions, doneToday),
    sessionsPerDay: plan.longBreakAfterSessions,
    sessionLabel: doneToday >= plan.longBreakAfterSessions
      ? `All ${plan.longBreakAfterSessions} sessions done`
      : `Session ${doneToday + 1} of ${plan.longBreakAfterSessions} today`,
    recentSessions: done.slice(0, 5),
    plan, loading, busy, syncError,
    disabled: loading || busy || !loaded,
    finishPending: state.session !== null && state.remaining === 0,
    toggle, reset: () => selectMode(stateRef.current.mode), selectMode, retry,
  };
}

export type FocusTimerController = ReturnType<typeof useFocusTimer>;
