import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  dashboardApi,
  milestonesApi,
  tasksApi,
  type ApiMilestone,
  type ApiTask,
  type DashboardSummary,
} from '../lib/api';

export interface NewTaskInput {
  title: string;
  /** Existing milestone to file the task under, or null to create `newMilestoneTitle` first. */
  milestoneId: string | null;
  newMilestoneTitle: string;
  dueAt: string | null;
}

export interface DashboardData {
  tasks: ApiTask[];
  milestones: ApiMilestone[];
  summary: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  createTask: (input: NewTaskInput) => Promise<void>;
}

/**
 * Loads the signed-in user's tasks, milestones, and dashboard summary from the API and exposes the
 * mutations the dashboard needs. Mount it only while logged in; `onSessionExpired` fires on a 401.
 */
export function useDashboardData(onSessionExpired: () => void): DashboardData {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [milestones, setMilestones] = useState<ApiMilestone[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        onSessionExpired();
        return;
      }
      setError(e instanceof Error ? e.message : 'Something went wrong');
    },
    [onSessionExpired],
  );

  const refresh = useCallback(async () => {
    try {
      const [taskPage, milestonePage, dashboard] = await Promise.all([tasksApi.list(), milestonesApi.list(), dashboardApi.summary()]);
      setTasks(taskPage.items);
      setMilestones(milestonePage.items);
      setSummary(dashboard);
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await dashboardApi.summary());
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const status = task.status === 'done' ? 'todo' : 'done';
      // Optimistic update; the server is the source of truth if the request fails.
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : null } : t)),
      );
      try {
        await tasksApi.update(id, { status });
        await refreshSummary();
      } catch (e) {
        fail(e);
        void refresh();
      }
    },
    [tasks, fail, refresh, refreshSummary],
  );

  const createTask = useCallback(
    async (input: NewTaskInput) => {
      try {
        let milestoneId = input.milestoneId;
        if (!milestoneId) {
          const created = await milestonesApi.create({ title: input.newMilestoneTitle });
          milestoneId = created.id;
        }
        await tasksApi.create({ milestoneId, title: input.title, dueAt: input.dueAt });
        await refresh();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) onSessionExpired();
        throw e;
      }
    },
    [refresh, onSessionExpired],
  );

  return { tasks, milestones, summary, loading, error, refresh, refreshSummary, toggleTask, createTask };
}
