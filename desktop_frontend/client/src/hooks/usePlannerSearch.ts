import { useEffect, useState } from 'react';
import { ApiError, dashboardApi, type ApiTask, type ApiMilestone } from '../lib/api';

export interface PlannerSearch {
  taskIds: ReadonlySet<string> | null;
  milestoneIds: ReadonlySet<string> | null;
  searching: boolean;
  error: string | null;
}

interface SearchMatch {
  query: string;
  tasks: ApiTask[];
  milestones: ApiMilestone[];
  taskIds: Set<string>;
  milestoneIds: Set<string>;
}

/** Shared server-side title search. Ignore old responses and refresh matches after a mutation. */
export function usePlannerSearch(
  search: string,
  tasks: ApiTask[],
  milestones: ApiMilestone[],
  onSessionExpired: () => void,
): PlannerSearch {
  const query = search.trim();
  const [result, setResult] = useState<SearchMatch | null>(null);
  const [failure, setFailure] = useState<{ query: string; message: string } | null>(null);
  useEffect(() => {
    if (query.length < 2 || query.length > 100) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const found = await dashboardApi.search(query);
        if (cancelled) return;
        setFailure(null);
        setResult({
          query, tasks, milestones,
          taskIds: new Set(found.tasks.map((t) => t.id)),
          milestoneIds: new Set(found.milestones.map((m) => m.id)),
        });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) onSessionExpired();
        setFailure({ query, message: e instanceof Error ? e.message : 'Could not search' });
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, tasks, milestones, onSessionExpired]);
  const active = query.length >= 2;
  const current = result?.query === query && result.tasks === tasks && result.milestones === milestones ? result : null;
  const error = query.length > 100 ? 'Search must be 100 characters or fewer.' : failure?.query === query ? failure.message : null;
  return {
    taskIds: active ? current?.taskIds ?? new Set<string>() : null,
    milestoneIds: active ? current?.milestoneIds ?? new Set<string>() : null,
    searching: active && !current && !error,
    error: active ? error : null,
  };
}
