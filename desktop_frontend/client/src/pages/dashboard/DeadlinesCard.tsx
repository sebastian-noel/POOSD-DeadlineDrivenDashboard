import type { Deadline, DeadlineRange } from '../../types';
import { Badge } from '../../components/Badge';

const RANGES: { id: DeadlineRange; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'three-weeks', label: 'Next 3 weeks' },
  { id: 'all', label: 'All' },
];

function dueLabel(daysUntil: number): string {
  if (daysUntil <= 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  return `In ${daysUntil} days`;
}

function DeadlineRow({ deadline }: { deadline: Deadline }) {
  return (
    <li className="deadline-row d-flex align-items-center">
      <div className="date-circle" aria-hidden="true">
        <span className="date-month">{deadline.month}</span>
        <span className="date-day">{deadline.day}</span>
      </div>
      <div className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ gap: 2 }}>
        <span className="t-title text-truncate">{deadline.title}</span>
        <span className="t-caption text-ink-secondary text-truncate">{deadline.context}</span>
      </div>
      <span className="t-caption-bold text-ink-secondary text-nowrap deadline-progress">{deadline.progress}</span>
      <Badge variant={deadline.daysUntil <= 1 ? 'urgent' : 'outline'}>{dueLabel(deadline.daysUntil)}</Badge>
    </li>
  );
}

interface DeadlinesCardProps {
  deadlines: Deadline[];
  range: DeadlineRange;
  onRangeChange: (range: DeadlineRange) => void;
}

export function DeadlinesCard({ deadlines, range, onRangeChange }: DeadlinesCardProps) {
  return (
    <section className="panel panel-deadlines d-flex flex-column" style={{ gap: 20 }}>
      <header className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center" style={{ gap: 10 }}>
          <h2 className="t-heading m-0">Upcoming deadlines</h2>
          <span className="pill count-pill" aria-label={`${deadlines.length} deadlines`}>
            {deadlines.length}
          </span>
        </div>
        <div className="pill range-tabs" role="tablist" aria-label="Deadline range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              className={`range-tab${range === r.id ? ' active' : ''}`}
              onClick={() => onRangeChange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>
      <ul className="deadline-list list-unstyled m-0 d-flex flex-column" style={{ gap: 12 }}>
        {deadlines.map((d) => (
          <DeadlineRow key={d.id} deadline={d} />
        ))}
        {deadlines.length === 0 && <li className="t-body text-ink-secondary py-4 text-center">No deadlines match.</li>}
      </ul>
    </section>
  );
}
