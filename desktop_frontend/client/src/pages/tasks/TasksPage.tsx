import { useId, useState, type ComponentProps } from 'react';
import { Badge } from '../../components/Badge';
import { Icon } from '../../components/Icon';
import { NewTaskModal } from '../../components/NewTaskModal';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';
import { FOCUS_PLAN } from '../../data/preferences';
import {
  SAMPLE_DONE_EARLIER_THIS_WEEK,
  SAMPLE_MODAL_MILESTONES,
  SAMPLE_TODAY_LABEL,
  plannedTaskFromInput,
  sampleTasks,
} from '../../data/sampleTasks';
import type { Notification, Page, PlannedTask, Task } from '../../types';
import { TaskRow } from '../dashboard/TasksCard';

type TaskFilter = 'all' | 'todo' | 'done';

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'done', label: 'Done' },
];

function toRow(task: PlannedTask): Task {
  return { id: task.id, label: task.label, tag: task.tag, context: task.milestone, done: task.done };
}

function byDueDate(a: PlannedTask, b: PlannedTask): number {
  return new Date(a.due?.iso ?? 0).getTime() - new Date(b.due?.iso ?? 0).getTime();
}

interface TasksPageProps {
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
 * Front-end design of the Tasks page. It runs on sample data and keeps changes
 * (new tasks, check-offs) in the browser only; the API team will connect it.
 */
export function TasksPage({
  search,
  onSearchChange,
  notifications,
  onDismissNotification,
  hasUnread,
  onOpenNotifications,
  onNavigate,
  notify,
}: TasksPageProps) {
  const [tasks, setTasks] = useState<PlannedTask[]>(sampleTasks);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [showNewTask, setShowNewTask] = useState(false);
  const listHeadingId = useId();
  const todayHeadingId = useId();
  const upcomingHeadingId = useId();
  const progressHeadingId = useId();
  const focusHeadingId = useId();

  const today = tasks.filter((t) => !t.due);
  const upcoming = tasks.filter((t) => t.due).sort(byDueDate);
  const doneToday = today.filter((t) => t.done).length;
  const doneThisWeek = SAMPLE_DONE_EARLIER_THIS_WEEK + tasks.filter((t) => t.done).length;
  // The next open task: today's list first, then the soonest upcoming one.
  const focusNext = today.find((t) => !t.done) ?? upcoming.find((t) => !t.done);

  const query = search.trim().toLowerCase();
  const shows = (t: PlannedTask) =>
    (filter === 'all' || (filter === 'done') === t.done) &&
    (!query || [t.label, t.tag, t.milestone].some((text) => text.toLowerCase().includes(query)));
  const todayVisible = today.filter(shows);
  const upcomingVisible = upcoming.filter(shows);

  const emptyText = query
    ? `No tasks match “${search.trim()}”.`
    : filter === 'done'
      ? 'Nothing checked off yet.'
      : filter === 'todo'
        ? 'All caught up.'
        : 'No tasks yet. Add one with New task.';

  const toggleTask = (id: string) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  // Without a due date a new task joins today's list (after the open ones); with one it goes to Upcoming.
  const addTask: ComponentProps<typeof NewTaskModal>['onCreate'] = async (input) => {
    const added = plannedTaskFromInput(input);
    setTasks((prev) => {
      if (added.due) return [...prev, added];
      const lastOpenToday = prev.findLastIndex((t) => !t.due && !t.done);
      const at = lastOpenToday + 1;
      return [...prev.slice(0, at), added, ...prev.slice(at)];
    });
    setShowNewTask(false);
    notify(`Added “${input.title}” to your tasks`);
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle={`${today.length} task${today.length === 1 ? '' : 's'} planned today · ${doneToday} already complete`}
      >
        <SearchPill value={search} onChange={onSearchChange} />
        <NotificationsMenu
          notifications={notifications}
          hasUnread={hasUnread}
          onOpen={onOpenNotifications}
          onDismiss={onDismissNotification}
        />
        <button type="button" className="btn-pill btn-pill-ink new-task-btn" onClick={() => setShowNewTask(true)}>
          <Icon name="plus-on-ink" />
          New task
        </button>
      </PageHeader>

      <div className="row g-4">
        <div className="col-12 col-xl">
          <section className="panel d-flex flex-column" style={{ gap: 22 }} aria-labelledby={listHeadingId}>
            <header className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <h2 id={listHeadingId} className="t-heading m-0">
                My tasks
              </h2>
              <div className="pill range-tabs range-tabs-sm" role="tablist" aria-label="Show tasks">
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

            {todayVisible.length > 0 && (
              <div className="d-flex flex-column" style={{ gap: 7 }}>
                <div className="d-flex align-items-center justify-content-between gap-3">
                  <h3 id={todayHeadingId} className="t-title m-0">
                    Today
                  </h3>
                  <span className="t-caption-bold text-ink-secondary">{SAMPLE_TODAY_LABEL}</span>
                </div>
                <ul className="task-list task-list-ruled list-unstyled m-0" aria-labelledby={todayHeadingId}>
                  {todayVisible.map((t) => (
                    <TaskRow key={t.id} task={toRow(t)} onToggle={toggleTask} />
                  ))}
                </ul>
              </div>
            )}

            {upcomingVisible.length > 0 && (
              <div className="d-flex flex-column" style={{ gap: 8 }}>
                <div className="d-flex align-items-center justify-content-between gap-3">
                  <h3 id={upcomingHeadingId} className="t-title m-0">
                    Upcoming
                  </h3>
                  <span className="t-caption-bold text-ink-secondary">Due date</span>
                </div>
                <ul className="task-list list-unstyled m-0" aria-labelledby={upcomingHeadingId}>
                  {upcomingVisible.map((t) => (
                    <li key={t.id} className="upcoming-row">
                      <TaskRow as="div" task={toRow(t)} onToggle={toggleTask} />
                      <span className="upcoming-due t-caption-bold text-ink-secondary">{t.due?.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {todayVisible.length === 0 && upcomingVisible.length === 0 && (
              <p className="t-body text-ink-secondary text-center py-4 m-0">{emptyText}</p>
            )}
          </section>
        </div>

        <div className="col-12 col-xl-auto col-side col-side-exact d-flex flex-column gap-4">
          <section className="panel h-auto d-flex flex-column" style={{ gap: 14 }} aria-labelledby={progressHeadingId}>
            <h2 id={progressHeadingId} className="t-heading m-0">
              Today’s progress
            </h2>
            <div className="d-flex align-items-center" style={{ gap: 10 }}>
              <span className="t-stat text-nowrap">
                {doneToday} of {today.length}
              </span>
              <span className="t-body text-ink-secondary">tasks complete</span>
            </div>
            {/* One segment per task planned today, finished ones filled in from the left. */}
            <div className="progress-segments" aria-hidden="true">
              {today.map((t, i) => (
                <span key={t.id} className={`progress-segment${i < doneToday ? ' done' : ''}`} />
              ))}
            </div>
            <hr className="divider-subtle" />
            <div className="d-flex align-items-center justify-content-between gap-3">
              <span className="t-body text-ink-secondary">This week</span>
              <span className="t-body-bold">{doneThisWeek} tasks done</span>
            </div>
          </section>

          <section className="panel h-auto d-flex flex-column" style={{ gap: 19 }} aria-labelledby={focusHeadingId}>
            <header className="d-flex align-items-center justify-content-between gap-2">
              <h2 id={focusHeadingId} className="t-heading m-0">
                Focus next
              </h2>
              {focusNext && <Badge>{focusNext.tag}</Badge>}
            </header>
            {focusNext ? (
              <>
                <div className="d-flex flex-column overflow-hidden" style={{ gap: 4 }}>
                  <span className="t-heading text-truncate">{focusNext.label}</span>
                  <span className="t-body text-ink-secondary text-truncate">{focusNext.milestone}</span>
                </div>
                <hr className="divider-subtle" />
                <dl className="m-0 d-flex flex-column" style={{ gap: 12 }}>
                  <div className="d-flex align-items-center justify-content-between gap-3">
                    <dt className="t-body text-ink-secondary">Milestone due</dt>
                    <dd className="t-body-bold m-0">{focusNext.milestoneDue}</dd>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-3">
                    <dt className="t-body text-ink-secondary">Focus block</dt>
                    <dd className="t-body-bold m-0">{FOCUS_PLAN.focusMinutes} minutes</dd>
                  </div>
                </dl>
                <button type="button" className="btn-pill btn-pill-ink focus-next-btn" onClick={() => onNavigate('Focus timer')}>
                  Open focus timer
                </button>
              </>
            ) : (
              <p className="t-body text-ink-secondary m-0">All caught up. Add a task to plan your next focus block.</p>
            )}
          </section>
        </div>
      </div>

      <NewTaskModal show={showNewTask} onClose={() => setShowNewTask(false)} milestones={SAMPLE_MODAL_MILESTONES} onCreate={addTask} />
    </>
  );
}
