/**
 * Client for the Erm Actually API (see ../../api).
 *
 * Paths are relative: in development Vite proxies `/api` to the local API (vite.config.ts), and in
 * production nginx serves the app and proxies `/api` to Node on the same domain. Set VITE_API_URL only
 * when the API lives on a different origin than the web app.
 */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'token';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** The login JWT, kept in localStorage so a refresh keeps you signed in. */
export const session = {
  get token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode); the session lasts until reload */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the login token. Default true; auth endpoints pass false. */
  auth?: boolean;
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Your session has expired. Please log in again.',
  404: 'Not found.',
  429: 'Too many requests. Please wait a moment and try again.',
};

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, { method = 'GET', body, auth = true }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? session.token : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the API running?');
  }

  const text = await response.text();
  const data = text ? parseJson(text) : null;
  if (!response.ok) {
    const code = typeof data?.error === 'string' ? data.error : 'REQUEST_FAILED';
    const message =
      typeof data?.message === 'string' ? data.message : (STATUS_MESSAGES[response.status] ?? `Request failed (${response.status})`);
    throw new ApiError(response.status, code, message);
  }
  return data as T;
}

// ---- Response shapes (mirror api/src/routes) ----

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: ApiUser;
}

export interface ApiMilestone {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
}

export type ApiTaskStatus = 'todo' | 'in_progress' | 'done';

export interface ApiTask {
  id: string;
  milestoneId: string;
  title: string;
  notes: string;
  status: ApiTaskStatus;
  dueAt: string | null;
  completedAt: string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface MilestoneProgress {
  id: string;
  title: string;
  dueAt: string | null;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

export interface DashboardSummary {
  tasks: {
    total: number;
    completed: number;
    completedLast7Days: number;
    completedPrevious7Days: number;
    overdue: number;
    dueNext7Days: number;
  };
  milestones: MilestoneProgress[];
  upcomingTasks: { id: string; title: string; milestoneId: string; dueAt: string | null }[];
  focusMinutesLast7Days: number;
  focusMinutesPrevious7Days: number;
}

export interface SearchResults {
  query: string;
  milestones: { id: string; title: string; dueAt: string | null }[];
  tasks: { id: string; title: string; status: ApiTaskStatus; milestoneId: string; dueAt: string | null }[];
}

export type FocusStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export interface ApiFocusSession {
  id: string;
  taskId: string | null;
  status: FocusStatus;
  targetSeconds: number;
  elapsedSeconds: number;
  completedAt: string | null;
}

// ---- Endpoints ----

export const authApi = {
  register: (email: string, password: string) =>
    api<{ id: string; email: string; emailVerified: boolean; message: string }>('/auth/register', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  login: (email: string, password: string) =>
    api<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  resendVerification: (email: string) =>
    api<{ message: string }>('/auth/resend-verification', { method: 'POST', body: { email }, auth: false }),
  forgotPassword: (email: string) =>
    api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token: string, password: string) =>
    api<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),
  me: () => api<ApiUser>('/me'),
};

export const contactApi = {
  send: (input: { email: string; subject: string; message: string }) =>
    api<{ id: string; message: string }>('/contact', { method: 'POST', body: input, auth: false }),
};

export const milestonesApi = {
  list: () => api<Paginated<ApiMilestone>>('/milestones?limit=100'),
  create: (input: { title: string; description?: string; dueAt?: string | null }) =>
    api<ApiMilestone>('/milestones', { method: 'POST', body: input }),
};

export const tasksApi = {
  list: () => api<Paginated<ApiTask>>('/tasks?limit=100'),
  create: (input: { milestoneId: string; title: string; notes?: string; dueAt?: string | null; status?: ApiTaskStatus }) =>
    api<ApiTask>('/tasks', { method: 'POST', body: input }),
  update: (id: string, patch: Partial<{ milestoneId: string; title: string; notes: string; dueAt: string | null; status: ApiTaskStatus }>) =>
    api<ApiTask>(`/tasks/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

export const dashboardApi = {
  summary: () => api<DashboardSummary>('/dashboard'),
  /** Server-side, case-insensitive partial match on task and milestone titles (q must be 2+ characters). */
  search: (q: string) => api<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};

export const focusApi = {
  active: () => api<{ session: ApiFocusSession | null }>('/focus-sessions/active'),
  list: () => api<Paginated<ApiFocusSession>>('/focus-sessions?limit=50'),
  start: (input: { taskId?: string | null; targetSeconds: number }) =>
    api<ApiFocusSession>('/focus-sessions', { method: 'POST', body: input }),
  act: (id: string, action: 'pause' | 'resume' | 'complete' | 'cancel') =>
    api<ApiFocusSession>(`/focus-sessions/${id}`, { method: 'PATCH', body: { action } }),
};
