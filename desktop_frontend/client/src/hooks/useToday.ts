import { useEffect, useState } from 'react';
import { startOfDay, toDateKey } from '../lib/dates';

/** Follow the browser's local date, including midnight and resuming an inactive tab. */
export function useToday(): Date {
  const [today, setToday] = useState(() => startOfDay(new Date()));
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      window.clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(update, midnight.getTime() - now.getTime() + 50);
    };
    const update = () => {
      const day = startOfDay(new Date());
      setToday((previous) => toDateKey(previous) === toDateKey(day) ? previous : day);
      schedule();
    };
    schedule();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return today;
}
