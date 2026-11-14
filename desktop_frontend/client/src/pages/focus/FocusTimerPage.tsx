import { useId } from 'react';
import { Badge } from '../../components/Badge';
import { SessionDots, TimerControls, TimerRing, WorkingOn } from '../../components/FocusTimerParts';
import { NotificationsMenu } from '../../components/NotificationsMenu';
import { PageHeader } from '../../components/PageHeader';
import { SearchPill } from '../../components/SearchPill';
import { FocusTimerFeedback } from '../../components/FocusTimerFeedback';
import type { FocusTimerController } from '../../hooks/useFocusTimer';
import type { ApiTask } from '../../lib/api';
import type { Notification, Task, TimerMode } from '../../types';

const MODES: { id: TimerMode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
];

interface FocusTimerPageProps {
  timer: FocusTimerController;
  tasks: ApiTask[];
  currentTask?: Task;
  onOpenSettings: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Enter in the search box: results live on the dashboard. */
  onSearchSubmit: () => void;
  notifications: Notification[];
  onDismissNotification: (id: string) => void;
  hasUnread: boolean;
  onOpenNotifications: () => void;
}

export function FocusTimerPage({
  timer,
  tasks,
  currentTask,
  onOpenSettings,
  search,
  onSearchChange,
  onSearchSubmit,
  notifications,
  onDismissNotification,
  hasUnread,
  onOpenNotifications,
}: FocusTimerPageProps) {
  const planRows = [
    { label: 'Focus block', minutes: timer.hasSession ? timer.duration / 60 : timer.plan.focusMinutes },
    { label: 'Short break', minutes: timer.plan.shortBreakMinutes },
    { label: 'Long break', minutes: timer.plan.longBreakMinutes },
  ];
  const taskTitles = new Map(tasks.map((task) => [task.id, task.title]));
  const sessionHeadingId = useId();
  const planHeadingId = useId();
  const recentHeadingId = useId();

  const status = timer.finishPending ? 'Save pending' : timer.running
    ? timer.mode === 'focus'
      ? 'In progress'
      : 'On break'
    : timer.started
      ? 'Paused'
      : 'Ready';

  return (
    <>
      <PageHeader title="Focus timer" subtitle={`Pomodoro · ${timer.sessionLabel}`}>
        <SearchPill value={search} onChange={onSearchChange} onSubmit={onSearchSubmit} />
        <NotificationsMenu
          notifications={notifications}
          hasUnread={hasUnread}
          onOpen={onOpenNotifications}
          onDismiss={onDismissNotification}
        />
        <button type="button" className="btn-pill btn-pill-ink header-btn" onClick={onOpenSettings}>
          Timer settings
        </button>
      </PageHeader>

      <FocusTimerFeedback timer={timer} />
      <div className="row g-4">
        <div className="col-12 col-xl">
          <section className="panel d-flex flex-column" style={{ gap: 24 }} aria-labelledby={sessionHeadingId}>
            <header className="d-flex align-items-center justify-content-between gap-2">
              <h2 id={sessionHeadingId} className="t-heading m-0">
                Focus session
              </h2>
              <Badge>{status}</Badge>
            </header>

            <div className="d-flex flex-column align-items-center" style={{ gap: 22 }}>
              <div className="pill range-tabs range-tabs-sm" role="tablist" aria-label="Session mode">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={timer.mode === m.id}
                    className={`range-tab${timer.mode === m.id ? ' active' : ''}`}
                    onClick={() => void timer.selectMode(m.id)}
                    disabled={timer.disabled}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '2px 0' }}>
                <TimerRing remaining={timer.remaining} duration={timer.duration} mode={timer.mode} size="large" />
              </div>

              <div className="session-controls d-flex flex-column" style={{ gap: 18 }}>
                <TimerControls
                  running={timer.running}
                  started={timer.started}
                  onToggle={() => void timer.toggle()}
                  onReset={() => void timer.reset()}
                  disabled={timer.disabled}
                  finishPending={timer.finishPending}
                />
                <div className="d-flex align-items-center justify-content-between">
                  <span className="t-body-bold">{timer.sessionLabel}</span>
                  <SessionDots total={timer.sessionsPerDay} completed={timer.completedSessions} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-auto col-side col-side-exact d-flex flex-column gap-4">
          <section className="panel h-auto d-flex flex-column" style={{ gap: 18 }} aria-labelledby={planHeadingId}>
            <h2 id={planHeadingId} className="t-heading m-0">
              Session plan
            </h2>
            <WorkingOn task={currentTask} hasSession={timer.hasSession} />
            <hr className="divider-subtle" />
            <dl className="m-0 d-flex flex-column" style={{ gap: 12 }}>
              {planRows.map((row) => (
                <div key={row.label} className="d-flex align-items-center justify-content-between">
                  <dt className="t-body text-ink-secondary">{row.label}</dt>
                  <dd className="t-body-bold m-0">{row.minutes} min</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel h-auto d-flex flex-column" style={{ gap: 14 }} aria-labelledby={recentHeadingId}>
            <h2 id={recentHeadingId} className="t-heading m-0">
              Recent sessions
            </h2>
            <ul className="recent-sessions list-unstyled m-0">
              {timer.recentSessions.map((s) => (
                <li key={s.id} className="d-flex align-items-center justify-content-between gap-3">
                  <div className="d-flex flex-column" style={{ gap: 2, minWidth: 0 }}>
                    <span className="t-body-bold text-truncate">{taskTitles.get(s.taskId ?? '') ?? 'Focus session'}</span>
                    <span className="t-caption text-ink-secondary">{new Date(s.completedAt!).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                  <span className="t-caption-bold text-nowrap">{Math.round(s.elapsedSeconds / 60)} min</span>
                </li>
              ))}
              {!timer.loading && timer.recentSessions.length === 0 && (
                <li className="t-body text-ink-secondary">No completed focus sessions yet.</li>
              )}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
