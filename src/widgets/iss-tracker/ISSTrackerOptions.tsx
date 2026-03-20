'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ISSTrackerData {
  refreshInterval: number;
  showMap: boolean;
}

export default function ISSTrackerOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ISSTrackerData>({
    refreshInterval: (data?.refreshInterval as number) ?? 1,
    showMap: (data?.showMap as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        refreshInterval: (data.refreshInterval as number) ?? 1,
        showMap: (data.showMap as boolean) ?? true,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Settings</h3>

        <FormSelect
          label="Refresh Interval"
          name="refreshInterval"
          value={String(state.refreshInterval)}
          options={[
            { value: '0.5', label: '30 seconds' },
            { value: '1', label: '1 minute' },
            { value: '2', label: '2 minutes' },
            { value: '5', label: '5 minutes' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <FormSelect
          label="Show Map"
          name="showMap"
          value={state.showMap ? 'true' : 'false'}
          options={[
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ]}
          onChange={(name, value) => handleChange(name, value === 'true')}
        />
      </div>
    </div>
  );
}
