import { SessionDots, TimerControls, TimerRing, WorkingOn } from '../../components/FocusTimerParts';
import { FOCUS_PLAN } from '../../data/mockData';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import type { Task, TimerMode } from '../../types';

const MODE_LABEL: Record<TimerMode, string> = {
  focus: `Pomodoro · ${FOCUS_PLAN.focusMinutes} / ${FOCUS_PLAN.shortBreakMinutes}`,
  short: `Break · ${FOCUS_PLAN.shortBreakMinutes} min`,
  long: `Long break · ${FOCUS_PLAN.longBreakMinutes} min`,
};

export function FocusTimer({ currentTask }: { currentTask?: Task }) {
  const timer = useFocusTimer();

  return (
    <section className="panel panel-deadlines d-flex flex-column justify-content-between gap-4">
      <header className="d-flex align-items-center justify-content-between gap-2">
        <h2 className="t-heading m-0">Focus timer</h2>
        <span className="pill mode-pill">{MODE_LABEL[timer.mode]}</span>
      </header>

      <div className="d-flex justify-content-center">
        <TimerRing remaining={timer.remaining} duration={timer.duration} mode={timer.mode} />
      </div>

      <WorkingOn task={currentTask} />

      <div className="d-flex align-items-center justify-content-between">
        <span className="t-body-bold">{timer.sessionLabel}</span>
        <SessionDots total={timer.sessionsPerDay} completed={timer.completedSessions} />
      </div>

      <TimerControls running={timer.running} started={timer.started} onToggle={timer.toggle} onReset={timer.reset} />
    </section>
  );
}
