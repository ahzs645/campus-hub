'use client';

import { InputHTMLAttributes } from 'react';

interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  name: string;
  onChange: (name: string, value: string | number | boolean) => void;
}

export default function FormInput({ label, name, type = 'text', value, onChange, ...props }: FormInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    onChange(name, val);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[var(--ui-text-muted)]">{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 outline-none transition-colors"
        style={{
          border: '1px solid var(--ui-input-border)',
        }}
        {...props}
      />
    </div>
  );
}
