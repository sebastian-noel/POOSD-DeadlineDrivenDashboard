import { useMemo, useState } from 'react';
import {
  TASKS_DONE_BEFORE_TODAY,
  TODAY_LABEL,
  USER_NAME,
  deadlines,
  milestones,
  notifications,
} from '../../data/mockData';
import type { DeadlineRange, Page, Task } from '../../types';
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

const TASKS_DONE_LAST_WEEK = 8;

function matches(query: string, ...fields: string[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f.toLowerCase().includes(q));
}

interface DashboardPageProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onNewTask: () => void;
  hasUnread: boolean;
  onOpenNotifications: () => void;
  onNavigate: (page: Page) => void;
}

export function DashboardPage({
  tasks,
  onToggleTask,
  onNewTask,
  hasUnread,
  onOpenNotifications,
  onNavigate,
}: DashboardPageProps) {
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DeadlineRange>('three-weeks');

  const query = search.trim();

  const visibleDeadlines = useMemo(
    () => deadlines.filter((d) => d.daysUntil <= RANGE_MAX_DAYS[range] && matches(query, d.title, d.context)),
    [range, query],
  );
  const visibleMilestones = useMemo(() => milestones.filter((m) => matches(query, m.title, m.detail)), [query]);
  const visibleTasks = useMemo(() => tasks.filter((t) => matches(query, t.label, t.tag)), [tasks, query]);

  const doneCount = tasks.filter((t) => t.done).length;
  const doneThisWeek = TASKS_DONE_BEFORE_TODAY + doneCount;
  const vsLastWeek = doneThisWeek - TASKS_DONE_LAST_WEEK;
  const currentTask = tasks.find((t) => !t.done);
  const upcomingThisWeek = deadlines.filter((d) => d.daysUntil <= 7).length;

  return (
    <>
      <Greeting
        userName={USER_NAME}
        dateLabel={TODAY_LABEL}
        upcomingThisWeek={upcomingThisWeek}
        search={search}
        onSearchChange={setSearch}
        notifications={notifications}
        hasUnread={hasUnread}
        onOpenNotifications={onOpenNotifications}
        onNewTask={onNewTask}
      />

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard label="Due this week" value="7 tasks" note="2 due tomorrow" icon="clock" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard label="Milestones on track" value="4 of 5" note="1 milestone at risk" icon="flag-stat" />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard label="Focus time this week" value="9h 40m" note="+1h 15m vs last week" icon="timer" noteMuted />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Tasks done this week"
            value={`${doneThisWeek} tasks`}
            note={`${Math.abs(vsLastWeek)} ${vsLastWeek >= 0 ? 'more' : 'fewer'} than last week`}
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
          <FocusTimer currentTask={currentTask} />
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
            onToggle={onToggleTask}
            onAddTask={onNewTask}
          />
        </div>
      </div>
    </>
  );
}
