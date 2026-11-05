const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Whole calendar days from today until `iso` (negative when overdue), in the browser's time zone. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

export function monthAbbrev(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short' }).toUpperCase();
}

export function dayOfMonth(iso: string): number {
  return new Date(iso).getDate();
}

/** e.g. "Oct 28" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** e.g. "Tuesday, October 27" */
export function todayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** 580 → "9h 40m"; 45 → "45m" */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest}m` : `${hours}h ${rest}m`;
}

/** Turns an `<input type="date">` value (YYYY-MM-DD) into an ISO timestamp at the end of that local day. */
export function dateInputToIso(value: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 23, 59, 0, 0).toISOString();
}
