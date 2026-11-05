import { useId } from 'react';
import { Icon } from './Icon';

interface SearchPillProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when Enter is pressed. Leave out when results already filter live on the same page. */
  onSubmit?: () => void;
}

export function SearchPill({ value, onChange, onSubmit }: SearchPillProps) {
  const inputId = useId();

  return (
    <form
      role="search"
      className="pill search-pill mb-0"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <label htmlFor={inputId} className="d-flex m-0">
        <Icon name="search" />
      </label>
      <input
        id={inputId}
        type="search"
        placeholder="Search tasks and milestones"
        aria-label="Search tasks and milestones"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
