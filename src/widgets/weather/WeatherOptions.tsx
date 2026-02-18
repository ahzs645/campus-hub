'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import AppIcon from '@/components/AppIcon';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface WeatherData {
  location: string;
  units: 'celsius' | 'fahrenheit';
  showDetails: boolean;
  apiKey: string;
  dataSource: 'openweathermap' | 'unbc-rooftop';
  refreshInterval: number;
  corsProxy: string;
}

export default function WeatherOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<WeatherData>({
    location: (data?.location as string) ?? 'Campus',
    units: (data?.units as 'celsius' | 'fahrenheit') ?? 'fahrenheit',
    showDetails: (data?.showDetails as boolean) ?? true,
    apiKey: (data?.apiKey as string) ?? '',
    dataSource: (data?.dataSource as 'openweathermap' | 'unbc-rooftop') ?? 'openweathermap',
    refreshInterval: (data?.refreshInterval as number) ?? 10,
    corsProxy: (data?.corsProxy as string) ?? 'https://corsproxy.io/?',
  });

  useEffect(() => {
    if (data) {
      setState({
        location: (data.location as string) ?? 'Campus',
        units: (data.units as 'celsius' | 'fahrenheit') ?? 'fahrenheit',
        showDetails: (data.showDetails as boolean) ?? true,
        apiKey: (data.apiKey as string) ?? '',
        dataSource: (data.dataSource as 'openweathermap' | 'unbc-rooftop') ?? 'openweathermap',
        refreshInterval: (data.refreshInterval as number) ?? 10,
        corsProxy: (data.corsProxy as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const isUNBC = state.dataSource === 'unbc-rooftop';

  return (
    <div className="space-y-6">
      {/* Data Source */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Data Source</h3>

        <FormSelect
          label="Weather Source"
          name="dataSource"
          value={state.dataSource}
          options={[
            { value: 'openweathermap', label: 'OpenWeatherMap API' },
            { value: 'unbc-rooftop', label: 'UNBC Rooftop Station' },
          ]}
          onChange={handleChange}
        />

        {isUNBC && (
          <div className="text-sm text-[var(--ui-text-muted)]">
            Live data from the UNBC lab building rooftop weather station in Prince George, BC.
            Provides 1-minute averaged readings including temperature, humidity, wind, and pressure.
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Weather Settings</h3>

        {!isUNBC && (
          <FormInput
            label="Location"
            name="location"
            type="text"
            value={state.location}
            placeholder="Campus"
            onChange={handleChange}
          />
        )}

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
          label="Show Details (humidity, wind, pressure)"
          name="showDetails"
          checked={state.showDetails}
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
            { value: '1', label: '1 minute' },
            { value: '5', label: '5 minutes' },
            { value: '10', label: '10 minutes' },
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />
      </div>

      {/* API Configuration - only for OpenWeatherMap */}
      {!isUNBC && (
        <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
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
      )}

      {/* CORS Proxy - for UNBC */}
      {isUNBC && (
        <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
          <h3 className="font-semibold text-[var(--ui-text)]">CORS Proxy</h3>

          <FormSelect
            label="CORS Proxy"
            name="corsProxy"
            value={state.corsProxy || 'https://corsproxy.io/?'}
            options={[
              { value: 'https://corsproxy.io/?', label: 'corsproxy.io (default)' },
              { value: 'https://api.cors.lol/?url=', label: 'cors.lol' },
              { value: 'https://api.allorigins.win/raw?url=', label: 'allorigins.win' },
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
            Required to fetch UNBC data from the browser. The station URL is appended to this proxy.
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-accent)] mb-1">
            {isUNBC ? 'UNBC Rooftop' : state.location}
          </div>
          <div className="flex items-center gap-3">
            <AppIcon
              name={isUNBC ? 'snowflake' : 'cloudSun'}
              className="w-8 h-8 text-white/80"
            />
            <div>
              <div className="text-2xl font-bold text-white">
                {isUNBC
                  ? (state.units === 'celsius' ? '-15°C' : '5°F')
                  : `72${state.units === 'celsius' ? '°C' : '°F'}`}
              </div>
              <div className="text-xs text-white/70">
                {isUNBC ? 'Partly Cloudy' : 'Partly Cloudy'}
              </div>
            </div>
          </div>
          {state.showDetails && (
            <div className="mt-2 flex gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1">
                <AppIcon name="droplets" className="w-3.5 h-3.5" />
                {isUNBC ? '40%' : '45%'}
              </span>
              <span className="flex items-center gap-1">
                <AppIcon name="wind" className="w-3.5 h-3.5" />
                {isUNBC
                  ? (state.units === 'celsius' ? '5.0 m/s' : '11 mph')
                  : '8 mph'}
              </span>
              {isUNBC && (
                <span className="flex items-center gap-1">
                  <AppIcon name="gauge" className="w-3.5 h-3.5" />
                  1010 hPa
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
