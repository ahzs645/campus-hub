'use client';

interface FormStepperProps {
  label: string;
  name: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (name: string, value: string) => void;
}

export default function FormStepper({
  label,
  name,
  value,
  min = 0,
  max = 20,
  step = 1,
  unit = 'px',
  onChange,
}: FormStepperProps) {
  const decrement = () => {
    const next = Math.max(min, value - step);
    onChange(name, String(next));
  };
  const increment = () => {
    const next = Math.min(max, value + step);
    onChange(name, String(next));
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
      <div
        className="flex items-center rounded-lg overflow-hidden bg-[var(--ui-input-bg)]"
        style={{ border: '1px solid var(--ui-input-border)' }}
      >
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="px-3 py-2 text-lg font-medium transition-colors text-[var(--ui-text)] hover:bg-[var(--ui-input-border)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <div className="flex-1 text-center text-sm font-medium text-[var(--ui-text)]">
          {value}{unit}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="px-3 py-2 text-lg font-medium transition-colors text-[var(--ui-text)] hover:bg-[var(--ui-input-border)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}
