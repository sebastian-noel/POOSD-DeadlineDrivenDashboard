import type { Milestone, MilestoneStatus } from '../../types';
import { Badge } from '../../components/Badge';

const FILL_COLOR: Record<MilestoneStatus, string> = {
  Completed: 'var(--color-status-complete)',
  'At risk': 'var(--color-status-risk)',
  'On track': 'var(--color-status-on-track)',
};

function ProgressBar({ percent, color, label }: { percent: number; color: string; label: string }) {
  return (
    <div className="progress-ea" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-ea-fill" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

/** One milestone: name and status, progress bar, then due date and percent. Also used on the Milestones page. */
export function MilestoneRow({ milestone: m }: { milestone: Milestone }) {
  return (
    <li className="d-flex flex-column" style={{ gap: 8 }}>
      <div className="d-flex align-items-center justify-content-between gap-2">
        <span className="t-title">{m.title}</span>
        <Badge>{m.status}</Badge>
      </div>
      <ProgressBar percent={m.percent} color={FILL_COLOR[m.status]} label={`${m.title} progress`} />
      <div className="d-flex align-items-center justify-content-between">
        <span className="t-caption text-ink-secondary">{m.detail}</span>
        <span className="t-caption-bold">{m.percent}%</span>
      </div>
    </li>
  );
}

interface MilestonesCardProps {
  milestones: Milestone[];
  onViewAll: () => void;
}

export function MilestonesCard({ milestones, onViewAll }: MilestonesCardProps) {
  return (
    <section className="panel panel-milestones d-flex flex-column" style={{ gap: 22 }}>
      <header className="d-flex align-items-center justify-content-between">
        <h2 className="t-heading m-0">Milestone progress</h2>
        <button type="button" className="btn btn-link p-0 t-body-bold link-ea text-nowrap" onClick={onViewAll}>
          View all
        </button>
      </header>
      <ul className="list-unstyled m-0 d-flex flex-column overflow-auto" style={{ gap: 22 }}>
        {milestones.map((m) => (
          <MilestoneRow key={m.id} milestone={m} />
        ))}
        {milestones.length === 0 && <li className="t-body text-ink-secondary py-4 text-center">No milestones match.</li>}
      </ul>
    </section>
  );
}
