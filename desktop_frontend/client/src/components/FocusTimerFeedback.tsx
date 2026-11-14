import type { FocusTimerController } from '../hooks/useFocusTimer';

export function FocusTimerFeedback({ timer }: { timer: FocusTimerController }) {
  return <>
    {timer.loading && <p role="status" className="t-caption text-ink-secondary">Loading focus sessions...</p>}
    {timer.syncError && <div role="alert" className="t-caption text-danger">
      {timer.syncError}
      <button type="button" className="btn btn-link" onClick={() => void timer.retry()} disabled={timer.busy || timer.loading}>Retry sync</button>
    </div>}
  </>;
}
