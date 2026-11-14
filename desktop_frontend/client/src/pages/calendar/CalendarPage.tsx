import { useId, useState, type ComponentProps } from 'react';
import { Icon } from '../../components/Icon';
import { NewTaskModal } from '../../components/NewTaskModal';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';
import { PlannerFeedback } from '../../components/PlannerFeedback';
import type { DashboardData } from '../../hooks/useDashboardData';
import type { PlannerSearch } from '../../hooks/usePlannerSearch';
import { useToday } from '../../hooks/useToday';
import { toCalendarEvents } from '../../lib/calendarModel';
import { daysUntil, dueLabel, formatShortDate, fromDateKey, toDateKey } from '../../lib/dates';
import type { CalendarEvent, Notification, Page, WeekStart } from '../../types';
import { CalendarKey, MonthGrid } from './MonthGrid';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function NextDeadlines({ events, today, onOpenTasks }: {
  events: CalendarEvent[];
  today: Date;
  onOpenTasks: () => void;
}) {
  const headingId = useId();
  const todayKey = toDateKey(today);
  const upcoming = events
    .filter((m) => m.kind === 'milestone' && m.status !== 'Completed' && m.date >= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <section className="panel h-auto d-flex flex-column" style={{ gap: 16 }} aria-labelledby={headingId}>
      <header className="d-flex align-items-center justify-content-between gap-3">
        <h2 id={headingId} className="t-heading m-0">
          Next deadlines
        </h2>
        <button type="button" className="btn btn-link p-0 border-0 t-body-bold link-ea text-nowrap lh-normal" onClick={onOpenTasks}>
          Open task list
        </button>
      </header>
      {upcoming.length > 0 ? (
        <ul className="next-deadlines list-unstyled m-0">
          {upcoming.map((m) => {
            const due = fromDateKey(m.date);
            return (
              <li key={m.id} className="d-flex align-items-center" style={{ gap: 14 }}>
                <div className="date-circle date-circle-lg" aria-hidden="true">
                  <span className="date-month">{due.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span>
                  <span className="date-day">{due.getDate()}</span>
                </div>
                <div className="d-flex flex-column overflow-hidden" style={{ gap: 2 }}>
                  <span className="t-title text-truncate">{m.title}</span>
                  <span className="t-caption text-ink-secondary text-truncate">
                    {m.project} · {dueLabel(daysUntil(due.toISOString(), today))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="t-body text-ink-secondary m-0">Nothing due soon.</p>
      )}
    </section>
  );
}

interface CalendarPageProps {
  data: DashboardData;
  matches: PlannerSearch;
  /** From Settings: the grid's first column. */
  weekStartsOn: WeekStart;
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
 * Month view of the same saved tasks and milestones used by the other planning pages.
 */
export function CalendarPage({
  data,
  matches,
  weekStartsOn,
  search,
  onSearchChange,
  notifications,
  onDismissNotification,
  hasUnread,
  onOpenNotifications,
  onNavigate,
  notify,
}: CalendarPageProps) {
  const today = useToday();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [showNewTask, setShowNewTask] = useState(false);
  const headingId = useId();

  const events = toCalendarEvents(data.tasks, data.milestones, data.summary?.milestones ?? [], today).filter(
    (event) => event.kind === 'task'
      ? matches.taskIds === null || matches.taskIds.has(event.id)
      : matches.milestoneIds === null || matches.milestoneIds.has(event.id),
  );
  const monthKey = toDateKey(month).slice(0, 7);
  const hasMonthEvents = events.some((event) => event.date.startsWith(monthKey));

  const changeMonth = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

  // Jump to the month the new task lands in so it's visible right away.
  const addTask: ComponentProps<typeof NewTaskModal>['onCreate'] = async (input) => {
    await data.createTask(input);
    setMonth(startOfMonth(input.dueAt ? new Date(input.dueAt) : today));
    onSearchChange('');
    setShowNewTask(false);
    notify(`Added “${input.title}” to ${input.dueAt ? formatShortDate(input.dueAt) : 'today'}`);
  };

  if (data.loading || (data.error && !data.summary)) return <PlannerFeedback data={data} matches={matches} />;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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

      <PlannerFeedback data={data} matches={matches} />
      <div className="d-flex flex-column gap-4">
        <section className="panel d-flex flex-column" style={{ gap: 18 }} aria-labelledby={headingId}>
          <header className="cal-toolbar">
            <div className="cal-month-nav">
              <h2 id={headingId} className="t-heading m-0 text-nowrap" aria-live="polite">
                {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="d-flex" style={{ gap: 6 }}>
                <button type="button" className="icon-btn cal-nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
                  <Icon name="chevron-left" size={18} />
                </button>
                <button type="button" className="icon-btn cal-nav-btn" onClick={() => changeMonth(1)} aria-label="Next month">
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
              <button type="button" className="btn-pill cal-today-btn" onClick={() => setMonth(startOfMonth(today))}>
                Today
              </button>
            </div>
            <CalendarKey />
          </header>
          {!hasMonthEvents && !matches.searching && !matches.error && (
            <p role="status" className="t-body text-ink-secondary m-0">
              {search.trim().length >= 2 ? 'No matching tasks or milestones this month.' : 'No tasks or milestones scheduled this month.'}
            </p>
          )}
          <MonthGrid
            month={month}
            today={today}
            weekStartsOn={weekStartsOn}
            events={events}
            onShowMore={() => onNavigate('Tasks')}
          />
        </section>

        <NextDeadlines events={events} today={today} onOpenTasks={() => onNavigate('Tasks')} />
      </div>

      <NewTaskModal show={showNewTask} onClose={() => setShowNewTask(false)} milestones={data.milestones} onCreate={addTask} />
    </>
  );
}
