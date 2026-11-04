import { useEffect, useState } from 'react';
import type { Task } from '../../types';
import { Icon, PlayIcon } from '../../components/Icon';

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

export function FocusTimer({ currentTask }: { currentTask?: Task }) {
  const [phase, setPhase] = useState<Phase>('focus');
  const [remaining, setRemaining] = useState(16 * 60 + 12);
  const [running, setRunning] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(1);

  const duration = phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS;

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
    } else {
      setPhase('focus');
      setRemaining(FOCUS_SECONDS);
    }
  }, [remaining, phase]);

  const reset = () => {
    setRunning(false);
    setRemaining(duration);
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

      <div className="d-flex align-items-center timer-controls" style={{ gap: 10 }}>
        <button type="button" className="btn-pill btn-pill-ink flex-grow-1" onClick={() => setRunning((r) => !r)}>
          {running ? <Icon name="pause" /> : <PlayIcon />}
          {running ? 'Pause' : remaining === duration ? 'Start' : 'Resume'}
        </button>
        <button type="button" className="icon-btn reset-btn" aria-label="Reset timer" onClick={reset}>
          <Icon name="reset" />
        </button>
      </div>
    </section>
  );
}
