import { useId, type ReactNode } from 'react';
import toggleOff from '../../assets/icons/toggle-off.svg';
import toggleOn from '../../assets/icons/toggle-on.svg';
import { Icon } from '../../components/Icon';

export function SettingsCard({
  title,
  gap,
  className = '',
  children,
}: {
  title: string;
  /** Vertical spacing between rows; differs per card in the Figma file. */
  gap: number;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section className={`panel d-flex flex-column ${className}`} style={{ gap }} aria-labelledby={headingId}>
      <h2 id={headingId} className="t-heading m-0">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email';
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="settings-field">
      <label htmlFor={id} className="t-body-bold">
        {label}
      </label>
      <div className="field-control">
        <input id={id} type={type} value={value} autoComplete={autoComplete} required onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: {
  label: string;
  /** NaN while the box is empty; `required` keeps it from being saved that way. */
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const unitId = useId();
  return (
    <div className="settings-field">
      <label htmlFor={id} className="t-body-bold">
        {label}
      </label>
      <div className="field-control">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          required
          value={Number.isNaN(value) ? '' : value}
          aria-describedby={unitId}
          onChange={(e) => onChange(e.target.valueAsNumber)}
        />
        <span id={unitId} className="t-caption-bold text-ink-secondary">
          {unit}
        </span>
      </div>
    </div>
  );
}

type SelectOption<T extends string> = T | { value: T; label: string };

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="settings-field">
      <label htmlFor={id} className="t-body-bold">
        {label}
      </label>
      <div className={`field-control field-select${disabled ? ' is-disabled' : ''}`}>
        <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((option) => {
            const { value: optionValue, label: optionLabel } =
              typeof option === 'string' ? { value: option, label: option } : option;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
        <Icon name="chevron-down" size={18} />
      </div>
    </div>
  );
}

export function SwitchRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className="d-flex align-items-center justify-content-between gap-3">
      <div className="d-flex flex-column flex-grow-1" style={{ gap: 3, minWidth: 0 }}>
        <span id={labelId} className="t-body-bold">
          {label}
        </span>
        <span id={descriptionId} className="t-caption text-ink-secondary">
          {description}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className="switch-btn"
        onClick={() => onChange(!checked)}
      >
        <img src={checked ? toggleOn : toggleOff} alt="" width={46} height={27} className="d-block" />
      </button>
    </div>
  );
}
