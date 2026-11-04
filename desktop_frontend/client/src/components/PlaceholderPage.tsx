import mascot from '../assets/mascot.svg';
import type { Page } from '../types';

export function PlaceholderPage({ page, onBack }: { page: Page; onBack: () => void }) {
  return (
    <section className="panel d-flex flex-column align-items-center justify-content-center text-center gap-3 py-5">
      <img src={mascot} alt="" width={210} height={113} />
      <h1 className="t-display m-0">{page}</h1>
      <p className="t-lead text-ink-secondary m-0">Erm, actually… this page hasn’t been built yet.</p>
      <button type="button" className="btn-pill btn-pill-ink new-task-btn mt-2" onClick={onBack}>
        Back to dashboard
      </button>
    </section>
  );
}
