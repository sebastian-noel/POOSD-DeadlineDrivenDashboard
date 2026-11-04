import { Icon, type IconName } from '../../components/Icon';

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: IconName;
  noteMuted?: boolean;
}

export function StatCard({ label, value, note, icon, noteMuted = false }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="d-flex align-items-center justify-content-between gap-2">
        <span className="t-body-bold text-ink-secondary">{label}</span>
        <span className="icon-ring">
          <Icon name={icon} />
        </span>
      </div>
      <span className="t-stat">{value}</span>
      <span className={`t-caption-bold${noteMuted ? ' text-ink-secondary' : ''}`}>{note}</span>
    </div>
  );
}
