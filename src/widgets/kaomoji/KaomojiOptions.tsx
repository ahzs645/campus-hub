'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const INTERVAL_OPTIONS = [
  { value: '3', label: '3 seconds' },
  { value: '5', label: '5 seconds' },
  { value: '8', label: '8 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
];

export default function KaomojiOptions({ data, onChange }: WidgetOptionsProps) {
  const [cycleInterval, setCycleInterval] = useState<number>(
    (data?.cycleInterval as number) ?? 5
  );

  useEffect(() => {
    if (data) {
      setCycleInterval((data.cycleInterval as number) ?? 5);
    }
  }, [data]);

  const handleChange = (_name: string, value: string | number | boolean) => {
    const num = Number(value);
    setCycleInterval(num);
    onChange({ ...data, cycleInterval: num });
  };

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto">
      <FormSelect
        label="Cycle Interval"
        name="cycleInterval"
        value={String(cycleInterval)}
        options={INTERVAL_OPTIONS}
        onChange={handleChange}
      />
      <div className="text-xs text-[var(--ui-text-muted)] text-center">
        How long each kaomoji is displayed before cycling to the next.
      </div>
    </div>
  );
}
