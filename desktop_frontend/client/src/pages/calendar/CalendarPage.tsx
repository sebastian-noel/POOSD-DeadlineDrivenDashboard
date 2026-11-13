import { useId, useState, type ComponentProps } from 'react';
import { Icon } from '../../components/Icon';
import { NewTaskModal } from '../../components/NewTaskModal';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';
import { SAMPLE_CALENDAR_TODAY, sampleCalendarMilestones } from '../../data/sampleCalendar';
import { SAMPLE_MODAL_MILESTONES, plannedTaskFromInput, sampleTasks } from '../../data/sampleTasks';
import { daysUntil, dueLabel, fromDateKey, toDateKey } from '../../lib/dates';
import type { CalendarEvent, Notification, Page, PlannedTask, WeekStart } from '../../types';
import { CalendarKey, MonthGrid } from './MonthGrid';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Tasks go on their due date; a task with no due date is planned for today. */
function taskEvents(tasks: PlannedTask[], today: Date): CalendarEvent[] {
  return tasks.map((t) => ({
    id: t.id,
    title: t.label,
    date: toDateKey(t.due ? new Date(t.due.iso) : today),
    kind: 'task',
    done: t.done,
    project: t.tag,
  }));
}

function NextDeadlines({ today, onOpenTasks }: { today: Date; onOpenTasks: () => void }) {
  const headingId = useId();
  const todayKey = toDateKey(today);
  const upcoming = sampleCalendarMilestones
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
 * Front-end design of the Calendar page (month view). It runs on sample data and keeps
 * new tasks in the browser only; the API team will connect it by mapping real tasks and
 * milestones into `CalendarEvent`s.
 */
export function CalendarPage({
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
  const today = SAMPLE_CALENDAR_TODAY;
  const [tasks, setTasks] = useState<PlannedTask[]>(sampleTasks);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [showNewTask, setShowNewTask] = useState(false);
  const headingId = useId();

  const query = search.trim().toLowerCase();
  const events = [...sampleCalendarMilestones, ...taskEvents(tasks, today)].filter(
    (e) => !query || [e.title, e.project].some((text) => text.toLowerCase().includes(query)),
  );

  const changeMonth = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

  // Jump to the month the new task lands in so it's visible right away.
  const addTask: ComponentProps<typeof NewTaskModal>['onCreate'] = async (input) => {
    const added = plannedTaskFromInput(input);
    setTasks((prev) => [...prev, added]);
    setMonth(startOfMonth(added.due ? new Date(added.due.iso) : today));
    setShowNewTask(false);
    notify(`Added “${input.title}” to ${added.due?.label ?? 'today'}`);
  };

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
          <MonthGrid
            month={month}
            today={today}
            weekStartsOn={weekStartsOn}
            events={events}
            onShowMore={() => onNavigate('Tasks')}
          />
        </section>

        <NextDeadlines today={today} onOpenTasks={() => onNavigate('Tasks')} />
      </div>

      <NewTaskModal show={showNewTask} onClose={() => setShowNewTask(false)} milestones={SAMPLE_MODAL_MILESTONES} onCreate={addTask} />
    </>
  );
}
