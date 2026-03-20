'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const INTERVAL_OPTIONS = [
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '45', label: '45 seconds' },
  { value: '60', label: '60 seconds' },
];

export default function RockPaperScissorsOptions({ data, onChange }: WidgetOptionsProps) {
  const [playInterval, setPlayInterval] = useState<number>(
    (data?.playInterval as number) ?? 15
  );

  useEffect(() => {
    if (data) {
      setPlayInterval((data.playInterval as number) ?? 15);
    }
  }, [data]);

  const handleChange = (_name: string, value: string | number | boolean) => {
    const val = Number(value);
    setPlayInterval(val);
    onChange({ ...data, playInterval: val });
  };

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto">
      <FormSelect
        label="Play Interval"
        name="playInterval"
        value={String(playInterval)}
        options={INTERVAL_OPTIONS}
        onChange={handleChange}
      />
      <div className="text-xs text-[var(--ui-text-muted)] text-center">
        How often a new round is automatically played.
      </div>
    </div>
  );
}
