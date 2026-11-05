import { useEffect, useMemo, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import type { DashboardData } from '../../hooks/useDashboardData';
import { dashboardApi, type ApiUser } from '../../lib/api';
import {
  MILESTONE_DEADLINE_PREFIX,
  buildNotifications,
  buildStats,
  milestoneTitles,
  toDeadlines,
  toUiMilestones,
  toUiTasks,
} from '../../lib/dashboardModel';
import { todayLabel } from '../../lib/dates';
import type { DeadlineRange, Page } from '../../types';
import { DeadlinesCard } from './DeadlinesCard';
import { FocusTimer } from './FocusTimer';
import { Greeting } from './Greeting';
import { MilestonesCard } from './MilestonesCard';
import { StatCard } from './StatCard';
import { TasksCard } from './TasksCard';

const RANGE_MAX_DAYS: Record<DeadlineRange, number> = {
  week: 7,
  'three-weeks': 21,
  all: Infinity,
};

/** The API needs at least this many characters before it searches. */
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

interface SearchMatch {
  query: string;
  taskIds: Set<string>;
  milestoneIds: Set<string>;
}

interface DashboardPageProps {
  user: ApiUser;
  data: DashboardData;
  onNewTask: () => void;
  hasUnread: boolean;
  onOpenNotifications: () => void;
  onNavigate: (page: Page) => void;
}

export function DashboardPage({ user, data, onNewTask, hasUnread, onOpenNotifications, onNavigate }: DashboardPageProps) {
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DeadlineRange>('three-weeks');
  const [match, setMatch] = useState<SearchMatch | null>(null);

  const query = search.trim();

  // Search is done by the server (partial, case-insensitive title match), debounced while typing.
  useEffect(() => {
    if (query.length < MIN_SEARCH_LENGTH) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const results = await dashboardApi.search(query);
        if (cancelled) return;
        setMatch({
          query,
          taskIds: new Set(results.tasks.map((t) => t.id)),
          milestoneIds: new Set(results.milestones.map((m) => m.id)),
        });
      } catch {
        /* keep showing the previous results while typing continues */
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const activeMatch = query.length >= MIN_SEARCH_LENGTH ? match : null;

  const titles = useMemo(() => milestoneTitles(data.milestones), [data.milestones]);
  const tasks = useMemo(() => toUiTasks(data.tasks, titles), [data.tasks, titles]);
  const milestones = useMemo(() => toUiMilestones(data.summary?.milestones ?? []), [data.summary]);
  const deadlines = useMemo(() => toDeadlines(data.tasks, data.summary?.milestones ?? [], titles), [data.tasks, data.summary, titles]);
  const notifications = useMemo(() => buildNotifications(deadlines, milestones), [deadlines, milestones]);
  const stats = useMemo(() => (data.summary ? buildStats(data.tasks, milestones, data.summary) : null), [data.tasks, milestones, data.summary]);

  const visibleTasks = activeMatch ? tasks.filter((t) => activeMatch.taskIds.has(t.id)) : tasks;
  const visibleMilestones = activeMatch ? milestones.filter((m) => activeMatch.milestoneIds.has(m.id)) : milestones;
  const visibleDeadlines = deadlines.filter((d) => {
    if (d.daysUntil > RANGE_MAX_DAYS[range]) return false;
    if (!activeMatch) return true;
    return d.id.startsWith(MILESTONE_DEADLINE_PREFIX)
      ? activeMatch.milestoneIds.has(d.id.slice(MILESTONE_DEADLINE_PREFIX.length))
      : activeMatch.taskIds.has(d.id);
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const currentTask = tasks.find((t) => !t.done);
  const upcomingThisWeek = deadlines.filter((d) => d.daysUntil <= 7).length;
  const userName = user.displayName || user.email.split('@')[0] || 'there';

  if (!data.summary || !stats) {
    return (
      <section className="panel d-flex flex-column align-items-center justify-content-center text-center gap-3 py-5">
        {data.error ? (
          <>
            <h1 className="t-heading m-0">Couldn’t load your dashboard</h1>
            <p className="t-body text-ink-secondary m-0">{data.error}</p>
            <button type="button" className="btn-pill btn-pill-ink mt-2" onClick={() => void data.refresh()}>
              Try again
            </button>
          </>
        ) : (
          <>
            <Spinner animation="border" />
            <p className="t-body text-ink-secondary m-0">Loading your dashboard…</p>
          </>
        )}
      </section>
    );
  }

  return (
    <>
      <Greeting
        userName={userName}
        dateLabel={todayLabel()}
        upcomingThisWeek={upcomingThisWeek}
        search={search}
        onSearchChange={setSearch}
        notifications={notifications}
        hasUnread={hasUnread}
        onOpenNotifications={onOpenNotifications}
        onNewTask={onNewTask}
      />

      {data.error && <div className="alert alert-danger t-caption py-2 m-0">{data.error}</div>}

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard label="Due this week" value={`${stats.dueThisWeek} task${stats.dueThisWeek === 1 ? '' : 's'}`} note={stats.dueThisWeekNote} icon="clock" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard label="Milestones on track" value={stats.milestonesOnTrack} note={stats.milestonesNote} icon="flag-stat" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard label="Focus time this week" value={stats.focusTime} note={stats.focusNote} icon="timer" noteMuted />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Tasks done this week"
            value={`${stats.doneThisWeek} task${stats.doneThisWeek === 1 ? '' : 's'}`}
            note={stats.doneNote}
            icon="list-checks"
            noteMuted
          />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl">
          <DeadlinesCard deadlines={visibleDeadlines} range={range} onRangeChange={setRange} />
        </div>
        <div className="col-12 col-xl-auto col-side">
          <FocusTimer currentTask={currentTask} onSessionComplete={data.refreshSummary} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl">
          <MilestonesCard milestones={visibleMilestones} onViewAll={() => onNavigate('Milestones')} />
        </div>
        <div className="col-12 col-xl-auto col-side">
          <TasksCard
            tasks={visibleTasks}
            doneCount={doneCount}
            totalCount={tasks.length}
            onToggle={(id) => void data.toggleTask(id)}
            onAddTask={onNewTask}
          />
        </div>
      </div>
    </>
  );
}
