import type { ReactNode } from 'react';
import mascot from '../assets/mascot.svg';

interface PageHeaderProps {
  title: ReactNode;
  subtitle: ReactNode;
  /** Right-hand actions (search, notifications, primary button). */
  children: ReactNode;
}

/** Mascot + title block with actions on the right, shared by every signed-in page. */
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <section className="d-flex flex-wrap align-items-center justify-content-between gap-4">
      <div className="d-flex align-items-center gap-4 flex-wrap">
        <img src={mascot} alt="Erm Actually cat mascot" width={210} height={113} />
        <div className="d-flex flex-column" style={{ gap: 6 }}>
          <h1 className="t-display m-0">{title}</h1>
          <p className="t-lead text-ink-secondary m-0">{subtitle}</p>
        </div>
      </div>

      <div className="d-flex align-items-center flex-wrap" style={{ gap: 12 }}>
        {children}
      </div>
    </section>
  );
}
