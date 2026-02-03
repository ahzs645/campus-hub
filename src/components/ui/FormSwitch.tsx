'use client';

interface FormSwitchProps {
  label: string;
  name: string;
  checked: boolean;
  onChange: (name: string, value: boolean) => void;
}

export default function FormSwitch({ label, name, checked, onChange }: FormSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(name, !checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[var(--ui-switch-on)]' : 'bg-[var(--ui-switch-off)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
