'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface WordOfTheDayData {
  category: string;
  refreshMode: string;
  cycleInterval: number;
}

export default function WordOfTheDayOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<WordOfTheDayData>(() => ({
    category: (data?.category as string) ?? 'all',
    refreshMode: (data?.refreshMode as string) ?? 'daily',
    cycleInterval: (data?.cycleInterval as number) ?? 30,
  }));

  useEffect(() => {
    if (data) {
      setState({
        category: (data.category as string) ?? 'all',
        refreshMode: (data.refreshMode as string) ?? 'daily',
        cycleInterval: (data.cycleInterval as number) ?? 30,
      });
    }
  }, [data]);

  const emit = (newState: WordOfTheDayData) => {
    setState(newState);
    onChange(newState as unknown as Record<string, unknown>);
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    emit({ ...state, [name]: value });
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <FormSelect
        label="Category"
        name="category"
        value={state.category}
        options={[
          { value: 'all', label: 'All categories' },
          { value: 'academic', label: 'Academic' },
          { value: 'literary', label: 'Literary' },
          { value: 'scientific', label: 'Scientific' },
          { value: 'philosophical', label: 'Philosophical' },
        ]}
        onChange={handleChange}
      />

      <FormSelect
        label="Refresh Mode"
        name="refreshMode"
        value={state.refreshMode}
        options={[
          { value: 'daily', label: 'New word every day' },
          { value: 'hourly', label: 'New word every hour' },
          { value: 'cycle', label: 'Cycle automatically' },
        ]}
        onChange={handleChange}
      />

      {state.refreshMode === 'cycle' && (
        <FormSelect
          label="Cycle Interval"
          name="cycleInterval"
          value={String(state.cycleInterval)}
          options={[
            { value: '15', label: '15 seconds' },
            { value: '30', label: '30 seconds' },
            { value: '60', label: '1 minute' },
            { value: '120', label: '2 minutes' },
            { value: '300', label: '5 minutes' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />
      )}
    </div>
  );
}
