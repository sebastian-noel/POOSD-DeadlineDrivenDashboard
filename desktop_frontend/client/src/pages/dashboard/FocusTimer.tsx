import type { FocusTimerController } from '../../hooks/useFocusTimer';
import type { Task } from '../../types';
import { SessionDots, TimerControls, TimerRing, WorkingOn } from '../../components/FocusTimerParts';
import { FocusTimerFeedback } from '../../components/FocusTimerFeedback';

interface FocusTimerProps {
  currentTask?: Task;
  timer: FocusTimerController;
}

/** Compact view of the same controller used by the standalone Focus timer page. */
export function FocusTimer({ currentTask, timer }: FocusTimerProps) {
  return (
    <section className="panel panel-deadlines d-flex flex-column justify-content-between gap-4">
      <header className="d-flex align-items-center justify-content-between gap-2">
        <h2 className="t-heading m-0">Focus timer</h2>
        <span className="pill mode-pill">
          {timer.mode === 'focus' ? `Pomodoro · ${timer.hasSession ? timer.duration / 60 : timer.plan.focusMinutes} / ${timer.plan.shortBreakMinutes}` : `${timer.mode === 'long' ? 'Long' : 'Short'} break`}
        </span>
      </header>
      <div className="d-flex justify-content-center">
        <TimerRing remaining={timer.remaining} duration={timer.duration} mode={timer.mode} />
      </div>
      <WorkingOn task={currentTask} hasSession={timer.hasSession} />
      <div className="d-flex align-items-center justify-content-between">
        <span className="t-body-bold">{timer.sessionLabel}</span>
        <SessionDots total={timer.sessionsPerDay} completed={timer.completedSessions} />
      </div>
      <div className="d-flex flex-column" style={{ gap: 6 }}>
        <TimerControls
          running={timer.running} started={timer.started} disabled={timer.disabled} finishPending={timer.finishPending}
          onToggle={() => void timer.toggle()} onReset={() => void timer.reset()}
        />
        <FocusTimerFeedback timer={timer} />
      </div>
    </section>
  );
}
