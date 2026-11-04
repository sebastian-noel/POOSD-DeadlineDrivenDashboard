import type { ReactNode } from 'react';

export type BadgeVariant = 'outline' | 'filled' | 'urgent';

export function Badge({ variant = 'outline', children }: { variant?: BadgeVariant; children: ReactNode }) {
  const modifier = variant === 'outline' ? '' : ` ${variant}`;
  return <span className={`pill badge-ea flex-shrink-0${modifier}`}>{children}</span>;
}
