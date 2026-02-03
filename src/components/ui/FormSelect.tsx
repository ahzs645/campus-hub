'use client';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (name: string, value: string) => void;
}

export default function FormSelect({ label, name, value, options, onChange }: FormSelectProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-3 py-2 border border-[var(--ui-input-border)] rounded-lg focus:ring-2 focus:ring-[var(--ui-input-focus)] focus:border-[var(--ui-input-focus)] outline-none transition-colors bg-[var(--ui-input-bg)] text-[var(--ui-text)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
