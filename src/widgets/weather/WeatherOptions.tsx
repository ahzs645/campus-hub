'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface WeatherData {
  location: string;
  units: 'celsius' | 'fahrenheit';
  showDetails: boolean;
  apiKey: string;
}

export default function WeatherOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<WeatherData>({
    location: (data?.location as string) ?? 'Campus',
    units: (data?.units as 'celsius' | 'fahrenheit') ?? 'fahrenheit',
    showDetails: (data?.showDetails as boolean) ?? true,
    apiKey: (data?.apiKey as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        location: (data.location as string) ?? 'Campus',
        units: (data.units as 'celsius' | 'fahrenheit') ?? 'fahrenheit',
        showDetails: (data.showDetails as boolean) ?? true,
        apiKey: (data.apiKey as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Weather Settings</h3>

        <FormInput
          label="Location"
          name="location"
          type="text"
          value={state.location}
          placeholder="Campus"
          onChange={handleChange}
        />

        <FormSelect
          label="Temperature Units"
          name="units"
          value={state.units}
          options={[
            { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
            { value: 'celsius', label: 'Celsius (°C)' },
          ]}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Details (humidity, wind)"
          name="showDetails"
          checked={state.showDetails}
          onChange={handleChange}
        />
      </div>

      {/* API Configuration */}
      <div className="space-y-4 border-t border-[var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">API Configuration</h3>

        <FormInput
          label="Weather API Key (optional)"
          name="apiKey"
          type="text"
          value={state.apiKey}
          placeholder="Enter API key for live data"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Leave empty to use demo data. Supports OpenWeatherMap API.
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-accent)] mb-1">{state.location}</div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⛅</span>
            <div>
              <div className="text-2xl font-bold text-white">
                72{state.units === 'celsius' ? '°C' : '°F'}
              </div>
              <div className="text-xs text-white/70">Partly Cloudy</div>
            </div>
          </div>
          {state.showDetails && (
            <div className="mt-2 flex gap-3 text-xs text-white/60">
              <span>💧 45%</span>
              <span>💨 8 mph</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
