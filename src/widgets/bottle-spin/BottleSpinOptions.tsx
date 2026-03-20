'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const INTERVAL_OPTIONS = [
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '45', label: '45 seconds' },
  { value: '60', label: '60 seconds' },
];

export default function BottleSpinOptions({ data, onChange }: WidgetOptionsProps) {
  const [spinInterval, setSpinInterval] = useState<number>(
    (data?.spinInterval as number) ?? 30
  );

  useEffect(() => {
    if (data) {
      setSpinInterval((data.spinInterval as number) ?? 30);
    }
  }, [data]);

  const handleChange = (_name: string, value: string | number | boolean) => {
    const val = Number(value);
    setSpinInterval(val);
    onChange({ ...data, spinInterval: val });
  };

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto">
      <FormSelect
        label="Spin Interval"
        name="spinInterval"
        value={String(spinInterval)}
        options={INTERVAL_OPTIONS}
        onChange={handleChange}
      />
      <div className="text-xs text-[var(--ui-text-muted)] text-center">
        How often the bottle automatically spins.
      </div>
    </div>
  );
}
