'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

/** Common Prince George / BC observation wells for quick selection. */
const WELL_PRESETS = [
  { value: 'OW378', label: 'OW378 — Prince George' },
  { value: 'OW381', label: 'OW381 — Prince George' },
  { value: 'OW217', label: 'OW217 — Prince George' },
  { value: 'OW336', label: 'OW336 — Quesnel' },
  { value: 'OW276', label: 'OW276 — Williams Lake' },
  { value: 'OW309', label: 'OW309 — Kamloops' },
  { value: 'OW354', label: 'OW354 — Kelowna' },
  { value: 'OW302', label: 'OW302 — Nanaimo' },
  { value: 'custom', label: 'Custom Well ID…' },
];

interface GwOptionsData {
  locationId: string;
  dataSet: string;
  displayMode: 'current' | 'history';
  refreshInterval: number;
  corsProxy: string;
}

export default function GroundwaterLevelOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<GwOptionsData>({
    locationId: (data?.locationId as string) ?? 'OW378',
    dataSet: (data?.dataSet as string) ?? '',
    displayMode: (data?.displayMode as 'current' | 'history') ?? 'current',
    refreshInterval: (data?.refreshInterval as number) ?? 30,
    corsProxy: (data?.corsProxy as string) ?? '',
  });

  const [presetValue, setPresetValue] = useState(() => {
    const loc = (data?.locationId as string) ?? 'OW378';
    return WELL_PRESETS.some((p) => p.value === loc) ? loc : 'custom';
  });

  useEffect(() => {
    if (data) {
      const loc = (data.locationId as string) ?? 'OW378';
      setState({
        locationId: loc,
        dataSet: (data.dataSet as string) ?? '',
        displayMode: (data.displayMode as 'current' | 'history') ?? 'current',
        refreshInterval: (data.refreshInterval as number) ?? 30,
        corsProxy: (data.corsProxy as string) ?? '',
      });
      setPresetValue(WELL_PRESETS.some((p) => p.value === loc) ? loc : 'custom');
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handlePreset = (_name: string, value: string) => {
    setPresetValue(value);
    if (value !== 'custom') {
      const newState = { ...state, locationId: value };
      setState(newState);
      onChange(newState);
    }
  };

  const isCustom = presetValue === 'custom';

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Observation Well
        </h3>

        <FormSelect
          label="Well Location"
          name="wellPreset"
          value={presetValue}
          options={WELL_PRESETS}
          onChange={handlePreset}
        />

        {isCustom && (
          <FormInput
            label="Custom Well ID"
            name="locationId"
            type="text"
            value={state.locationId}
            placeholder="OW378"
            onChange={handleChange}
          />
        )}

        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          BC observation well identifier. Find wells at the{' '}
          <span className="underline">BC Groundwater Level Data Interactive Map</span>.
          Data is fetched from the AQUARIUS platform via CORS proxy.
        </div>

        <FormInput
          label="Dataset Filter (optional)"
          name="dataSet"
          type="text"
          value={state.dataSet}
          placeholder="SGWL (auto-detected if blank)"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          The time series identifier to display. Leave blank to auto-select the
          primary groundwater level dataset (SGWL). Available datasets are
          loaded from the API.
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Display
        </h3>

        <FormSelect
          label="Display Mode"
          name="displayMode"
          value={state.displayMode}
          options={[
            { value: 'current', label: 'Current Level' },
            { value: 'history', label: '7-Day History Chart' },
          ]}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Connection
        </h3>

        <FormInput
          label="CORS Proxy (required)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://corsproxy.io/?"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          A CORS proxy is required to access the BC AQUARIUS platform from
          the browser. Without it, mock data will be shown.
        </div>

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

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">
          Preview
        </h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-blue-500/20">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8"
              >
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--ui-text)]">
                5.234 <span className="text-sm font-normal text-[var(--ui-text-muted)]">m</span>
              </div>
              <div className="text-xs text-[var(--ui-text-muted)]">
                {state.locationId} &bull; {state.displayMode === 'history' ? '7-Day History' : 'Current Level'}
              </div>
            </div>
          </div>
          {state.displayMode === 'history' && (
            <div className="mt-3 h-8 rounded bg-blue-500/10 flex items-end px-1 gap-[2px]">
              {[40, 45, 42, 48, 55, 52, 60, 58, 62, 65, 63, 68].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500/40 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
