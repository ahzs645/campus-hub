'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface AuroraForecastData {
  refreshInterval: number;
  corsProxy: string;
  latitude: number;
}

const KP_LEVELS = [
  { kp: 0, label: 'Quiet', color: '#6b7280' },
  { kp: 1, label: 'Quiet', color: '#4b5563' },
  { kp: 2, label: 'Quiet', color: '#4b5563' },
  { kp: 3, label: 'Unsettled', color: '#22c55e' },
  { kp: 4, label: 'Active', color: '#10b981' },
  { kp: 5, label: 'Minor Storm', color: '#06b6d4' },
  { kp: 6, label: 'Moderate', color: '#8b5cf6' },
  { kp: 7, label: 'Strong', color: '#a855f7' },
  { kp: 8, label: 'Severe', color: '#d946ef' },
  { kp: 9, label: 'Extreme', color: '#ec4899' },
];

export default function AuroraForecastOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<AuroraForecastData>({
    refreshInterval: (data?.refreshInterval as number) ?? 15,
    corsProxy: (data?.corsProxy as string) ?? '',
    latitude: (data?.latitude as number) ?? 54,
  });

  useEffect(() => {
    if (data) {
      setState({
        refreshInterval: (data.refreshInterval as number) ?? 15,
        corsProxy: (data.corsProxy as string) ?? '',
        latitude: (data.latitude as number) ?? 54,
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
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Location
        </h3>

        <FormInput
          label="Latitude (°N)"
          name="latitude"
          type="number"
          value={state.latitude}
          min={0}
          max={90}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Your latitude determines aurora visibility predictions. Prince George,
          BC is ~54°N. Higher latitudes see aurora at lower Kp values.
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Data Source
        </h3>

        <FormInput
          label="CORS Proxy (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://corsproxy.io/?"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          NOAA SWPC APIs are typically CORS-friendly. Only set a proxy if direct
          access is blocked. Without access, demo data is shown.
        </div>

        <FormInput
          label="Refresh Interval (minutes)"
          name="refreshInterval"
          type="number"
          value={state.refreshInterval}
          min={5}
          max={120}
          onChange={handleChange}
        />
      </div>

      {/* Kp index legend */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">
          Kp Index Scale
        </h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex justify-between mb-3">
            {KP_LEVELS.filter((_, i) => i % 2 === 0).map((l) => (
              <div key={l.kp} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.kp}
                </div>
                <span className="text-[9px] text-[var(--ui-text-muted)] text-center leading-tight">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex gap-px">
            {KP_LEVELS.map((l) => (
              <div
                key={l.kp}
                className="flex-1 rounded-full"
                style={{ backgroundColor: l.color }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
