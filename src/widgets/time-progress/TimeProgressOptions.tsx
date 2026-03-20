'use client';

import { useState, useEffect } from 'react';
import { FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface TimeProgressData {
  displayMode: 'dots' | 'bars';
  showLabels: boolean;
}

const DISPLAY_MODE_OPTIONS = [
  { value: 'dots', label: 'Dots' },
  { value: 'bars', label: 'Bars' },
];

export default function TimeProgressOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<TimeProgressData>(() => ({
    displayMode: (data?.displayMode as 'dots' | 'bars') ?? 'dots',
    showLabels: (data?.showLabels as boolean) ?? true,
  }));

  useEffect(() => {
    if (data) {
      setState({
        displayMode: (data.displayMode as 'dots' | 'bars') ?? 'dots',
        showLabels: (data.showLabels as boolean) ?? true,
      });
    }
  }, [data]);

  const emit = (newState: TimeProgressData) => {
    setState(newState);
    onChange(newState as unknown as Record<string, unknown>);
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    emit({ ...state, [name]: value });
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Display</h3>

        <FormSelect
          label="Display Mode"
          name="displayMode"
          value={state.displayMode}
          options={DISPLAY_MODE_OPTIONS}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Labels"
          name="showLabels"
          checked={state.showLabels}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Show DAY, WEEK, MONTH, YEAR labels next to each progress indicator.
        </div>
      </div>
    </div>
  );
}
