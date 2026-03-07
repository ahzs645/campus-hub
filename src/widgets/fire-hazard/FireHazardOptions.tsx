'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const FIRE_CENTRES = [
  { value: 'Cariboo Fire Centre', label: 'Cariboo' },
  { value: 'Coastal Fire Centre', label: 'Coastal' },
  { value: 'Kamloops Fire Centre', label: 'Kamloops' },
  { value: 'Northwest Fire Centre', label: 'Northwest' },
  { value: 'Prince George Fire Centre', label: 'Prince George' },
  { value: 'Southeast Fire Centre', label: 'Southeast' },
];

interface FireHazardData {
  fireCentre: string;
  refreshInterval: number;
  corsProxy: string;
}

export default function FireHazardOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<FireHazardData>({
    fireCentre: (data?.fireCentre as string) ?? 'Cariboo Fire Centre',
    refreshInterval: (data?.refreshInterval as number) ?? 30,
    corsProxy: (data?.corsProxy as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        fireCentre: (data.fireCentre as string) ?? 'Cariboo Fire Centre',
        refreshInterval: (data.refreshInterval as number) ?? 30,
        corsProxy: (data.corsProxy as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const dangerColors = [
    { cls: 1, label: 'Low', color: '#22c55e' },
    { cls: 2, label: 'Moderate', color: '#3b82f6' },
    { cls: 3, label: 'High', color: '#eab308' },
    { cls: 4, label: 'Very High', color: '#f97316' },
    { cls: 5, label: 'Extreme', color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Fire Centre
        </h3>

        <FormSelect
          label="BC Fire Centre"
          name="fireCentre"
          value={state.fireCentre}
          options={FIRE_CENTRES}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Select the BC Wildfire Service fire centre to display danger ratings
          for. Data is sourced from the BC Government fire weather danger
          summary.
        </div>

        <FormInput
          label="CORS Proxy (required)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://corsproxy.io/?"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          A CORS proxy is required to fetch data from the BC Government site.
          Without a proxy, mock data will be shown.
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Settings
        </h3>

        <FormInput
          label="Refresh Interval (minutes)"
          name="refreshInterval"
          type="number"
          value={state.refreshInterval}
          min={10}
          max={120}
          onChange={handleChange}
        />
      </div>

      {/* Danger class legend */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">
          Danger Classes
        </h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex justify-between mb-3">
            {dangerColors.map((d) => (
              <div key={d.cls} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: d.color,
                    color: d.cls <= 1 ? '#052e16' : d.cls === 3 ? '#422006' : '#fff',
                  }}
                >
                  {d.cls}
                </div>
                <span className="text-[10px] text-[var(--ui-text-muted)]">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex">
            {dangerColors.map((d) => (
              <div
                key={d.cls}
                className="flex-1"
                style={{ backgroundColor: d.color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
