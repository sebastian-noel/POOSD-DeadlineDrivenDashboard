import { CheckMarkIcon } from '../../components/Icon';
import { toDateKey } from '../../lib/dates';
import type { CalendarEvent, MilestoneStatus, WeekStart } from '../../types';

const STATUSES: MilestoneStatus[] = ['On track', 'At risk', 'Completed'];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A day lists this many items; the rest fold into "+N more". */
const MAX_ITEMS_PER_DAY = 3;

/** "At risk" → "status-at-risk"; sets the chip's tint and bar color. */
function statusClass(status: MilestoneStatus): string {
  return `status-${status.toLowerCase().replace(' ', '-')}`;
}

/** Read after each item's title by screen readers, since the chip style carries this. */
function describe(event: CalendarEvent): string {
  return event.kind === 'task' ? ', task' : `, milestone, ${event.status.toLowerCase()}`;
}

/** Finished tasks aren't listed; each day just counts them ("✓ 3 done"). */
function isDoneTask(event: CalendarEvent): boolean {
  return event.kind === 'task' && event.done;
}

/** The six weeks shown for `month`, starting on the chosen weekday. */
function gridDays(month: Date, weekStartsOn: WeekStart): Date[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = weekStartsOn === 'Monday' ? 1 : 0;
  const lead = (new Date(year, monthIndex, 1).getDay() - firstWeekday + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, monthIndex, 1 - lead + i));
}

/** Milestones first, then tasks, keeping the given order within each group. */
function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of [...events].sort((a, b) => Number(a.kind === 'task') - Number(b.kind === 'task'))) {
    const day = byDate.get(event.date);
    if (day) day.push(event);
    else byDate.set(event.date, [event]);
  }
  return byDate;
}

/** Tasks are plain text with a grey dot; milestones are chips tinted by status. */
function CalendarItem({ event }: { event: CalendarEvent }) {
  const className = event.kind === 'task' ? 'cal-event cal-task' : `cal-event cal-chip ${statusClass(event.status)}`;
  return (
    <li className={className} title={event.title}>
      {event.kind === 'task' && <span className="cal-dot" aria-hidden="true" />}
      <span className="cal-event-title">
        {event.title}
        <span className="visually-hidden">{describe(event)}</span>
      </span>
    </li>
  );
}

/** The key above the grid: what a task looks like, and a sample chip for each milestone status. */
export function CalendarKey() {
  return (
    <div className="cal-key t-caption-bold text-ink-secondary">
      <span className="cal-key-group">
        <span className="cal-dot" aria-hidden="true" />
        Task
      </span>
      <span className="cal-key-group">
        Milestone
        {STATUSES.map((s) => (
          <span key={s} className={`cal-chip ${statusClass(s)}`}>
            {s}
          </span>
        ))}
      </span>
    </div>
  );
}

interface MonthGridProps {
  /** Any date in the month to show. */
  month: Date;
  today: Date;
  weekStartsOn: WeekStart;
  events: CalendarEvent[];
  /** "+N more" on a busy day. */
  onShowMore: () => void;
}

/** Six-week month grid. Each day lists its milestones, then its open tasks, then counts the done ones. */
export function MonthGrid({ month, today, weekStartsOn, events, onShowMore }: MonthGridProps) {
  const byDate = groupByDate(events);
  const todayKey = toDateKey(today);
  const weekdays = weekStartsOn === 'Monday' ? [...WEEKDAYS.slice(1), WEEKDAYS[0]] : WEEKDAYS;

  return (
    <div className="cal-scroll">
      <div className="cal-grid">
        <div className="cal-weekdays" aria-hidden="true">
          {weekdays.map((d) => (
            <span key={d} className="t-caption-bold text-ink-secondary">
              {d}
            </span>
          ))}
        </div>
        <ol className="cal-days list-unstyled m-0">
          {gridDays(month, weekStartsOn).map((day, i) => {
            const key = toDateKey(day);
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = key === todayKey;
            // As in Figma, the first cell and the 1st of the next month name their month ("Sep 27", "Nov 1").
            const label =
              !inMonth && (i === 0 || day.getDate() === 1)
                ? day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : String(day.getDate());
            const items = byDate.get(key) ?? [];
            const open = items.filter((e) => !isDoneTask(e));
            const done = items.filter(isDoneTask);
            const shown = open.slice(0, MAX_ITEMS_PER_DAY);
            const more = open.length - shown.length;
            const doneTitles = done.map((e) => e.title).join(', ');
            const className = [
              'cal-day',
              !inMonth && 'other-month',
              key < todayKey && 'past',
              isToday && 'is-today',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li key={key} className={className} aria-current={isToday ? 'date' : undefined}>
                <span className="cal-date">
                  <span aria-hidden="true">{label}</span>
                  <span className="visually-hidden">
                    {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </span>
                {shown.length > 0 && (
                  <ul className="cal-events list-unstyled m-0">
                    {shown.map((event) => (
                      <CalendarItem key={event.id} event={event} />
                    ))}
                  </ul>
                )}
                {more > 0 && (
                  <button type="button" className="cal-more" onClick={onShowMore} aria-label={`${more} more, open the task list`}>
                    +{more} more
                  </button>
                )}
                {done.length > 0 && (
                  <p className="cal-done m-0" title={doneTitles}>
                    <CheckMarkIcon />
                    {done.length} done
                    <span className="visually-hidden">: {doneTitles}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
