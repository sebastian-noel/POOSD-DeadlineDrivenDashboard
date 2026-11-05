import { formatTime } from '../hooks/useFocusTimer';
import type { Task, TimerMode } from '../types';
import { Icon, PlayIcon } from './Icon';

/** Compact = dashboard card, large = Focus timer page (the same Figma ring at 145%). */
const RING = {
  compact: { size: 216, stroke: 12 },
  large: { size: 313.2, stroke: 17.4 },
} as const;

/** Blue while more than half is left, amber past halfway, red under 20%, green during breaks. */
function ringColor(mode: TimerMode, fractionLeft: number): string {
  if (mode !== 'focus') return 'var(--color-status-complete)';
  if (fractionLeft > 0.5) return 'var(--color-status-on-track)';
  if (fractionLeft > 0.2) return 'var(--color-status-warning)';
  return 'var(--color-status-risk)';
}

export function TimerRing({
  remaining,
  duration,
  mode,
  size = 'compact',
}: {
  remaining: number;
  duration: number;
  mode: TimerMode;
  size?: keyof typeof RING;
}) {
  const { size: ringSize, stroke } = RING[size];
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = ringSize / 2;
  const fractionLeft = remaining / duration;

  return (
    <div
      className={`timer-ring${size === 'large' ? ' timer-ring-lg' : ''} d-flex flex-column align-items-center justify-content-center`}
    >
      <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-line-subtle)" strokeWidth={stroke} />
        {remaining > 0 && (
          <circle
            className="timer-ring-progress"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={ringColor(mode, fractionLeft)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fractionLeft)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      <span className="timer-time position-relative" role="timer" aria-live="off">
        {formatTime(remaining)}
      </span>
      <span className="t-body text-ink-secondary position-relative timer-caption">
        left of {formatTime(duration)}
        {mode !== 'focus' ? ' break' : ''}
      </span>
    </div>
  );
}

export function SessionDots({ total, completed }: { total: number; completed: number }) {
  return (
    <div className="d-flex" style={{ gap: 6 }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`session-dot${i < completed ? ' done' : i === completed ? ' current' : ''}`} />
      ))}
    </div>
  );
}

export function WorkingOn({ task }: { task?: Task }) {
  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      <span className="t-overline text-ink-secondary">WORKING ON</span>
      <div className="pill current-task">
        <Icon name="flag" />
        <div className="d-flex flex-column overflow-hidden" style={{ gap: 1 }}>
          <span className="t-body-bold text-truncate">{task ? task.label : 'Nothing left for today'}</span>
          <span className="t-caption text-ink-secondary text-truncate">
            {task ? task.context : 'Add a task to keep the streak going'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TimerControls({
  running,
  started,
  onToggle,
  onReset,
}: {
  running: boolean;
  started: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <div className="d-flex align-items-center timer-controls" style={{ gap: 10 }}>
      <button type="button" className="btn-pill btn-pill-ink flex-grow-1" onClick={onToggle}>
        {running ? <Icon name="pause" /> : <PlayIcon />}
        {running ? 'Pause' : started ? 'Resume' : 'Start'}
      </button>
      <button type="button" className="icon-btn reset-btn" aria-label="Reset timer" onClick={onReset}>
        <Icon name="reset" />
      </button>
    </div>
  );
}
