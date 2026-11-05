import bell from '../assets/icons/bell.svg';
import check from '../assets/icons/check.svg';
import clock from '../assets/icons/clock.svg';
import flag from '../assets/icons/flag.svg';
import flagStat from '../assets/icons/flag-stat.svg';
import listChecks from '../assets/icons/list-checks.svg';
import pause from '../assets/icons/pause.svg';
import plus from '../assets/icons/plus.svg';
import plusOnInk from '../assets/icons/plus-on-ink.svg';
import reset from '../assets/icons/reset.svg';
import search from '../assets/icons/search.svg';
import timer from '../assets/icons/timer.svg';

const icons = {
  bell,
  check,
  clock,
  flag,
  'flag-stat': flagStat,
  'list-checks': listChecks,
  pause,
  plus,
  'plus-on-ink': plusOnInk,
  reset,
  search,
  timer,
} as const;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20 }: IconProps) {
  return <img src={icons[name]} alt="" aria-hidden="true" width={size} height={size} className="d-block flex-shrink-0" />;
}

/** Not in the Figma icon set: small "x" used to clear a notification. */
export function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className="d-block flex-shrink-0">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Not in the Figma icon set: shown in place of Pause while the timer is stopped. */
export function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className="d-block flex-shrink-0">
      <path d="M6 3.9v12.2a.8.8 0 0 0 1.2.7l9.6-6.1a.8.8 0 0 0 0-1.4L7.2 3.2A.8.8 0 0 0 6 3.9Z" fill="white" />
    </svg>
  );
}
