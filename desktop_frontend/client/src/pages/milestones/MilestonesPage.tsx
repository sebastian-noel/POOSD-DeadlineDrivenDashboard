import { useId, useState } from 'react';
import { Badge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { NewMilestoneModal, type NewMilestoneInput } from '../../components/NewMilestoneModal';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';
import { PlannerFeedback } from '../../components/PlannerFeedback';
import type { DashboardData } from '../../hooks/useDashboardData';
import type { PlannerSearch } from '../../hooks/usePlannerSearch';
import { plannerProgress, nextMilestone } from '../../lib/plannerModel';
import { toUiMilestones } from '../../lib/dashboardModel';
import type { NextMilestone, Notification, Page } from '../../types';
import { MilestoneRow } from '../dashboard/MilestonesCard';
import { TaskRow } from '../dashboard/TasksCard';

type MilestoneFilter = 'all' | 'active' | 'completed';

const FILTERS: { id: MilestoneFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

interface NextDueCardProps {
  milestone: NextMilestone;
  pendingTaskIds: ReadonlySet<string>;
  onToggleTask: (id: string) => void;
  onOpenTasks: () => void;
}

function NextDueCard({ milestone, pendingTaskIds, onToggleTask, onOpenTasks }: NextDueCardProps) {
  const headingId = useId();

  return (
    <section className="panel h-auto d-flex flex-column" style={{ gap: 20 }} aria-labelledby={headingId}>
      <header className="d-flex align-items-center justify-content-between gap-2">
        <h2 id={headingId} className="t-heading m-0">
          Next due
        </h2>
        <Badge variant={milestone.urgent ? 'urgent' : 'outline'}>{milestone.dueLabel}</Badge>
      </header>

      <div className="d-flex align-items-center" style={{ gap: 14 }}>
        <div className="date-circle date-circle-lg" aria-hidden="true">
          <span className="date-month">{milestone.month}</span>
          <span className="date-day">{milestone.day}</span>
        </div>
        <div className="d-flex flex-column overflow-hidden" style={{ gap: 2 }}>
          <span className="t-heading text-truncate">{milestone.title}</span>
          <span className="t-body text-ink-secondary text-truncate">{milestone.context}</span>
        </div>
      </div>

      <hr className="divider-subtle" />

      <dl className="m-0 d-flex flex-column" style={{ gap: 10 }}>
        <div className="d-flex align-items-center justify-content-between gap-3">
          <dt className="t-body text-ink-secondary">Due date</dt>
          <dd className="t-body-bold m-0">{milestone.dueDate}</dd>
        </div>
        <div className="d-flex align-items-center justify-content-between gap-3">
          <dt className="t-body text-ink-secondary">Tasks finished</dt>
          <dd className="t-body-bold m-0">
            {milestone.completedTasks} of {milestone.totalTasks}
          </dd>
        </div>
      </dl>

      <hr className="divider-subtle" />

      <div className="d-flex flex-column" style={{ gap: 8 }}>
        <h3 className="t-title m-0">Remaining tasks</h3>
        <ul className="task-list task-list-ruled list-unstyled m-0">
          {milestone.remainingTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggleTask} disabled={pendingTaskIds.has(task.id)} />
          ))}
        </ul>
      </div>

      <div className="d-flex">
        <button type="button" className="btn btn-link p-0 border-0 t-body-bold link-ea text-nowrap lh-normal" onClick={onOpenTasks}>
          Open task list
        </button>
      </div>
    </section>
  );
}

interface MilestonesPageProps {
  data: DashboardData;
  matches: PlannerSearch;
  search: string;
  onSearchChange: (value: string) => void;
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  hasUnread: boolean;
  onOpenNotifications: () => void;
  onNavigate: (page: Page) => void;
  /** Shows a toast. */
  notify: (message: string) => void;
}

/**
 * Milestones and their progress are derived from the shared API records.
 */
export function MilestonesPage({
  data,
  matches,
  search,
  onSearchChange,
  notifications,
  onDismissNotification,
  hasUnread,
  onOpenNotifications,
  onNavigate,
  notify,
}: MilestonesPageProps) {
  const progress = plannerProgress(data.milestones, data.tasks);
  const milestones = toUiMilestones(progress);
  const next = nextMilestone(progress, data.tasks);
  const [filter, setFilter] = useState<MilestoneFilter>('all');
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const listHeadingId = useId();

  const query = search.trim().toLowerCase();
  const visible = milestones.filter(
    (m) =>
      (filter === 'all' || (filter === 'completed') === (m.status === 'Completed')) &&
      (matches.milestoneIds === null || matches.milestoneIds.has(m.id)),
  );
  const atRisk = milestones.filter((m) => m.status === 'At risk').length;

  const emptyText = query
    ? `No milestones match “${search.trim()}”.`
    : filter === 'completed'
      ? 'No completed milestones yet.'
      : filter === 'active'
        ? 'Every milestone is finished.'
        : 'No milestones yet. Add one with New milestone.';

  const toggleTask = (id: string) => void data.toggleTask(id);

  const addMilestone = async (input: NewMilestoneInput) => {
    await data.createMilestone(input);
    setShowNewMilestone(false);
    notify(`Added the “${input.title}” milestone`);
  };

  if (data.loading || (data.error && !data.summary)) return <PlannerFeedback data={data} matches={matches} />;

  return (
    <>
      <PageHeader
        title="Milestones"
        subtitle={`${milestones.length} milestone${milestones.length === 1 ? '' : 's'} across your projects · ${atRisk === 0 ? 'none' : atRisk} at risk`}
      >
        <SearchPill value={search} onChange={onSearchChange} />
        <NotificationsMenu
          notifications={notifications}
          hasUnread={hasUnread}
          onOpen={onOpenNotifications}
          onDismiss={onDismissNotification}
        />
        <button type="button" className="btn-pill btn-pill-ink new-task-btn" onClick={() => setShowNewMilestone(true)}>
          <Icon name="plus-on-ink" />
          New milestone
        </button>
      </PageHeader>

      <PlannerFeedback data={data} matches={matches} />
      <div className="row g-4">
        <div className="col-12 col-xl">
          <section className="panel d-flex flex-column" style={{ gap: 24 }} aria-labelledby={listHeadingId}>
            <header className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <h2 id={listHeadingId} className="t-heading m-0">
                Milestone progress
              </h2>
              <div className="pill range-tabs range-tabs-sm" role="tablist" aria-label="Show milestones">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.id}
                    className={`range-tab${filter === f.id ? ' active' : ''}`}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </header>
            <ul className="milestone-list list-unstyled m-0">
              {visible.map((m) => (
                <MilestoneRow key={m.id} milestone={m} />
              ))}
              {visible.length === 0 && <li className="t-body text-ink-secondary py-4 text-center">{matches.searching ? 'Searching milestones...' : matches.error ? 'Search is unavailable.' : emptyText}</li>}
            </ul>
          </section>
        </div>

        <div className="col-12 col-xl-auto col-side col-side-exact">
          {next ? (
            <NextDueCard
              milestone={next}
              pendingTaskIds={data.pendingTaskIds}
              onToggleTask={toggleTask}
              onOpenTasks={() => onNavigate('Tasks')}
            />
          ) : (
            <section className="panel">
              <h2 className="t-heading">Next due</h2>
              <p className="t-body text-ink-secondary m-0">No unfinished milestones with a due date.</p>
            </section>
          )}
        </div>
      </div>

      <NewMilestoneModal show={showNewMilestone} onClose={() => setShowNewMilestone(false)} onCreate={addMilestone} />
    </>
  );
}
