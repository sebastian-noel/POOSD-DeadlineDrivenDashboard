import { useCallback, useEffect, useState } from 'react';
import type { Task } from '../../types';
import { Icon, PlayIcon } from '../../components/Icon';
import { ApiError, focusApi, type ApiFocusSession } from '../../lib/api';
import { startOfDay } from '../../lib/dates';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const SESSIONS_PER_DAY = 4;

const RING_SIZE = 216;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Phase = 'focus' | 'break';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Blue while more than half is left, amber past halfway, red under 20%, green during breaks. */
function ringColor(phase: Phase, fractionLeft: number): string {
  if (phase === 'break') return 'var(--color-status-complete)';
  if (fractionLeft > 0.5) return 'var(--color-status-on-track)';
  if (fractionLeft > 0.2) return 'var(--color-status-warning)';
  return 'var(--color-status-risk)';
}

function TimerRing({ remaining, duration, phase }: { remaining: number; duration: number; phase: Phase }) {
  const fractionLeft = remaining / duration;
  const center = RING_SIZE / 2;
  return (
    <div className="timer-ring d-flex flex-column align-items-center justify-content-center" style={{ gap: 2 }}>
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
        <circle cx={center} cy={center} r={RING_RADIUS} fill="none" stroke="var(--color-line-subtle)" strokeWidth={RING_STROKE} />
        {remaining > 0 && (
          <circle
            className="timer-ring-progress"
            cx={center}
            cy={center}
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor(phase, fractionLeft)}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - fractionLeft)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      <span className="timer-time position-relative" role="timer" aria-live="off">
        {formatTime(remaining)}
      </span>
      <span className="t-body text-ink-secondary position-relative">
        left of {formatTime(duration)}
        {phase === 'break' ? ' break' : ''}
      </span>
    </div>
  );
}

function SessionDots({ completed }: { completed: number }) {
  return (
    <div className="d-flex" style={{ gap: 6 }} aria-hidden="true">
      {Array.from({ length: SESSIONS_PER_DAY }, (_, i) => (
        <span key={i} className={`session-dot${i < completed ? ' done' : i === completed ? ' current' : ''}`} />
      ))}
    </div>
  );
}

interface FocusTimerProps {
  currentTask?: Task;
  /** Called after a focus session is recorded on the server, so "Focus time this week" can refresh. */
  onSessionComplete?: () => void;
}

/**
 * Pomodoro timer. Focus phases are recorded as focus sessions on the API (start / pause / resume /
 * complete / cancel); breaks are local only. The countdown itself runs in the browser.
 */
export function FocusTimer({ currentTask, onSessionComplete }: FocusTimerProps) {
  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const duration = phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;

  const adopt = useCallback((session: ApiFocusSession) => {
    setSessionId(session.id);
    setPhase('focus');
    setRemaining(Math.max(0, session.targetSeconds - session.elapsedSeconds));
    setRunning(session.status === 'running');
  }, []);

  // Pick up a session that is still open on the server (e.g. after a reload) and today's completed count.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ session }, list] = await Promise.all([focusApi.active(), focusApi.list()]);
        if (cancelled) return;
        if (session) adopt(session);
        const todayStart = startOfDay(new Date()).getTime();
        const doneToday = list.items.filter((s) => s.status === 'completed' && s.completedAt && new Date(s.completedAt).getTime() >= todayStart);
        setCompletedSessions(Math.min(SESSIONS_PER_DAY, doneToday.length));
      } catch (err: unknown) {
        if (!cancelled) setSyncError(err instanceof Error ? err.message : 'Could not load focus sessions');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adopt]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining > 0) return;
    if (phase === 'focus') {
      setCompletedSessions((c) => Math.min(SESSIONS_PER_DAY, c + 1));
      setPhase('break');
      setRemaining(BREAK_SECONDS);
      if (sessionId) {
        setSessionId(null);
        focusApi
          .act(sessionId, 'complete')
          .then(() => onSessionComplete?.())
          .catch((err: unknown) => setSyncError(err instanceof Error ? err.message : 'Could not save the session'));
      }
    } else {
      setPhase('focus');
      setRemaining(FOCUS_SECONDS);
    }
  }, [remaining, phase, sessionId, onSessionComplete]);

  /** Runs an API call for the timer without blocking it; failures show as a small note. */
  const sync = async <T,>(call: () => Promise<T>): Promise<T | null> => {
    try {
      const value = await call();
      setSyncError(null);
      return value;
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : 'Could not sync with the server');
      return null;
    }
  };

  const start = async () => {
    setRunning(true);
    if (phase !== 'focus') return;
    if (sessionId) {
      await sync(() => focusApi.act(sessionId, 'resume'));
      return;
    }
    const session = await sync(async () => {
      try {
        return await focusApi.start({ taskId: currentTask?.id ?? null, targetSeconds: FOCUS_SECONDS });
      } catch (err: unknown) {
        // Another tab or device already has a session open; continue that one instead.
        if (!(err instanceof ApiError && err.code === 'ACTIVE_SESSION_EXISTS')) throw err;
        const { session: existing } = await focusApi.active();
        if (!existing) throw err;
        return existing.status === 'paused' ? focusApi.act(existing.id, 'resume') : existing;
      }
    });
    if (session) adopt(session);
  };

  const pause = async () => {
    setRunning(false);
    if (sessionId && phase === 'focus') await sync(() => focusApi.act(sessionId, 'pause'));
  };

  const reset = async () => {
    setRunning(false);
    setRemaining(duration);
    if (sessionId) {
      const id = sessionId;
      setSessionId(null);
      await sync(() => focusApi.act(id, 'cancel'));
    }
  };

  const sessionLabel =
    completedSessions >= SESSIONS_PER_DAY
      ? `All ${SESSIONS_PER_DAY} sessions done`
      : `Session ${completedSessions + 1} of ${SESSIONS_PER_DAY} today`;

  return (
    <section className="panel panel-deadlines d-flex flex-column justify-content-between gap-4">
      <header className="d-flex align-items-center justify-content-between gap-2">
        <h2 className="t-heading m-0">Focus timer</h2>
        <span className="pill mode-pill">{phase === 'focus' ? 'Pomodoro · 25 / 5' : 'Break · 5 min'}</span>
      </header>

      <div className="d-flex justify-content-center">
        <TimerRing remaining={remaining} duration={duration} phase={phase} />
      </div>

      <div className="d-flex flex-column" style={{ gap: 8 }}>
        <span className="t-overline text-ink-secondary">WORKING ON</span>
        <div className="pill current-task">
          <Icon name="flag" />
          <div className="d-flex flex-column overflow-hidden" style={{ gap: 1 }}>
            <span className="t-body-bold text-truncate">{currentTask ? currentTask.label : 'Nothing left for today'}</span>
            <span className="t-caption text-ink-secondary text-truncate">
              {currentTask ? currentTask.context : 'Add a task to keep the streak going'}
            </span>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-between">
        <span className="t-body-bold">{sessionLabel}</span>
        <SessionDots completed={completedSessions} />
      </div>

      <div className="d-flex flex-column" style={{ gap: 6 }}>
        <div className="d-flex align-items-center timer-controls" style={{ gap: 10 }}>
          <button type="button" className="btn-pill btn-pill-ink flex-grow-1" onClick={() => void (running ? pause() : start())}>
            {running ? <Icon name="pause" /> : <PlayIcon />}
            {running ? 'Pause' : remaining === duration ? 'Start' : 'Resume'}
          </button>
          <button type="button" className="icon-btn reset-btn" aria-label="Reset timer" onClick={() => void reset()}>
            <Icon name="reset" />
          </button>
        </div>
        {syncError && <span className="t-caption text-danger">{syncError}</span>}
      </div>
    </section>
  );
}
