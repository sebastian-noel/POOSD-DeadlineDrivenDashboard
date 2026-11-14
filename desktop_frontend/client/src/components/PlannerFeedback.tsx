import { Spinner } from 'react-bootstrap';
import type { DashboardData } from '../hooks/useDashboardData';
import type { PlannerSearch } from '../hooks/usePlannerSearch';

export function PlannerFeedback({ data, matches }: { data: DashboardData; matches: PlannerSearch }) {
  return (
    <>
      {data.loading && (
        <div role="status" className="text-center p-4">
          <Spinner size="sm" animation="border" /> Loading your plans...
        </div>
      )}
      {data.error && (
        <div role="alert" className="alert alert-danger">
          {data.error}
          <button type="button" className="btn btn-link" onClick={() => void data.refresh()}>Retry</button>
        </div>
      )}
      {matches.searching && <p role="status" className="t-body text-ink-secondary">Searching...</p>}
      {matches.error && <div role="alert" className="alert alert-danger">{matches.error}</div>}
    </>
  );
}
