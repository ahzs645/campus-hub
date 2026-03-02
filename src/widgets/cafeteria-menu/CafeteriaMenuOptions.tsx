'use client';

import { useState, useMemo } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface CafeteriaData {
  menuUrl: string;
  refreshInterval: number;
  corsProxy: string;
  breakfastEnd: string;
  lunchEnd: string;
  dinnerEnd: string;
}

const deriveState = (data: Record<string, unknown> | undefined): CafeteriaData => ({
  menuUrl: (data?.menuUrl as string) ?? 'https://unbc.icaneat.ca/menu/',
  refreshInterval: (data?.refreshInterval as number) ?? 30,
  corsProxy: (data?.corsProxy as string) ?? '',
  breakfastEnd: (data?.breakfastEnd as string) ?? '10:30',
  lunchEnd: (data?.lunchEnd as string) ?? '14:00',
  dinnerEnd: (data?.dinnerEnd as string) ?? '19:00',
});

export default function CafeteriaMenuOptions({ data, onChange }: WidgetOptionsProps) {
  const initial = useMemo(() => deriveState(data), [data]);
  const [state, setState] = useState<CafeteriaData>(initial);

  // Re-sync when parent data changes (e.g. preset applied)
  const dataKey = JSON.stringify(data);
  useMemo(() => {
    setState(deriveState(data));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Menu Source */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Menu Source</h3>

        <FormInput
          label="Menu Page URL"
          name="menuUrl"
          type="text"
          value={state.menuUrl}
          placeholder="https://unbc.icaneat.ca/menu/"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          URL of the cafeteria menu page (icaneat.ca or similar). The widget fetches this page
          via the CORS proxy and parses the menu content.
        </div>
      </div>

      {/* Meal Time Windows */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Meal Schedule</h3>

        <div className="text-sm text-[var(--ui-text-muted)] mb-2">
          The widget shows the current meal based on time of day. Configure when each
          meal period ends.
        </div>

        <FormInput
          label="Breakfast ends at"
          name="breakfastEnd"
          type="text"
          value={state.breakfastEnd}
          placeholder="10:30"
          onChange={handleChange}
        />

        <FormInput
          label="Lunch ends at"
          name="lunchEnd"
          type="text"
          value={state.lunchEnd}
          placeholder="14:00"
          onChange={handleChange}
        />

        <FormInput
          label="Dinner ends at"
          name="dinnerEnd"
          type="text"
          value={state.dinnerEnd}
          placeholder="19:00"
          onChange={handleChange}
        />
      </div>

      {/* Refresh Interval */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Refresh Interval</h3>

        <FormSelect
          label="Auto-refresh every"
          name="refreshInterval"
          value={String(state.refreshInterval)}
          options={[
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '120', label: '2 hours' },
            { value: '360', label: '6 hours' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />
      </div>

      {/* CORS Proxy */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">CORS Proxy</h3>

        <FormSelect
          label="CORS Proxy"
          name="corsProxy"
          value={state.corsProxy || ''}
          options={[
            { value: '', label: 'Use global setting' },
            { value: 'custom', label: 'Custom URL...' },
          ]}
          onChange={handleChange}
        />

        {state.corsProxy === 'custom' && (
          <FormInput
            label="Custom Proxy URL"
            name="corsProxy"
            type="text"
            value=""
            placeholder="https://your-proxy.example.com/?url="
            onChange={handleChange}
          />
        )}

        <div className="text-sm text-[var(--ui-text-muted)]">
          A CORS proxy is required to fetch the menu page from the browser.
          Without it, demo data is shown.
        </div>
      </div>
    </div>
  );
}
