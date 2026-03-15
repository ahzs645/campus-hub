'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const BASIN_PRESETS = [
  { value: '', label: 'Auto (highest level)' },
  { value: 'Bridge', label: 'Bridge' },
  { value: 'Central Coast', label: 'Central Coast' },
  { value: 'Central Pacific Range', label: 'Central Pacific Range' },
  { value: 'Chilcotin', label: 'Chilcotin' },
  { value: 'Clearwater', label: 'Clearwater' },
  { value: 'Creston', label: 'Creston' },
  { value: 'East Peace', label: 'East Peace' },
  { value: 'East Vancouver Island', label: 'East Vancouver Island' },
  { value: 'Eastern Pacific Range', label: 'Eastern Pacific Range' },
  { value: 'Elk-Flathead Valleys', label: 'Elk-Flathead Valleys' },
  { value: 'Finlay', label: 'Finlay' },
  { value: 'Fort Nelson', label: 'Fort Nelson' },
  { value: 'Haida Gwaii', label: 'Haida Gwaii' },
  { value: 'Kettle River', label: 'Kettle River' },
  { value: 'Kootenay Lake-West Arm', label: 'Kootenay Lake-West Arm' },
  { value: 'Kootenay River', label: 'Kootenay River' },
  { value: 'Lower Mainland', label: 'Lower Mainland' },
  { value: 'Lower Thompson', label: 'Lower Thompson' },
  { value: 'Nechako-Lakes', label: 'Nechako-Lakes' },
  { value: 'Nicola', label: 'Nicola' },
  { value: 'North Peace', label: 'North Peace' },
  { value: 'North Thompson', label: 'North Thompson' },
  { value: 'Northwest', label: 'Northwest' },
  { value: 'Okanagan', label: 'Okanagan' },
  { value: 'Parsnip', label: 'Parsnip' },
  { value: 'Quesnel', label: 'Quesnel' },
  { value: 'Similkameen', label: 'Similkameen' },
  { value: 'Skeena-Bulkley', label: 'Skeena-Bulkley' },
  { value: 'Skeena-Nass', label: 'Skeena-Nass' },
  { value: 'Slocan-Lower Columbia', label: 'Slocan-Lower Columbia' },
  { value: 'South Cariboo', label: 'South Cariboo' },
  { value: 'South Peace', label: 'South Peace' },
  { value: 'South Thompson', label: 'South Thompson' },
  { value: 'Stikine', label: 'Stikine' },
  { value: 'Sunshine Coast', label: 'Sunshine Coast' },
  { value: 'Upper Arrow Lakes', label: 'Upper Arrow Lakes' },
  { value: 'Upper Columbia', label: 'Upper Columbia' },
  { value: 'Upper Fraser East', label: 'Upper Fraser East' },
  { value: 'Upper Fraser West', label: 'Upper Fraser West' },
  { value: 'West Vancouver Island', label: 'West Vancouver Island' },
];

interface DroughtOptionsData {
  basin: string;
  displayMode: 'single' | 'overview';
  refreshInterval: number;
  corsProxy: string;
}

export default function DroughtLevelOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<DroughtOptionsData>({
    basin: (data?.basin as string) ?? '',
    displayMode: (data?.displayMode as 'single' | 'overview') ?? 'single',
    refreshInterval: (data?.refreshInterval as number) ?? 60,
    corsProxy: (data?.corsProxy as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        basin: (data.basin as string) ?? '',
        displayMode: (data.displayMode as 'single' | 'overview') ?? 'single',
        refreshInterval: (data.refreshInterval as number) ?? 60,
        corsProxy: (data.corsProxy as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const droughtLevels = [
    { level: 0, label: 'Normal', color: '#10b981' },
    { level: 1, label: 'Dry', color: '#84cc16' },
    { level: 2, label: 'Very Dry', color: '#eab308' },
    { level: 3, label: 'Severely Dry', color: '#f97316' },
    { level: 4, label: 'Extremely Dry', color: '#ef4444' },
    { level: 5, label: 'Exceptionally Dry', color: '#991b1b' },
  ];

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Water Basin
        </h3>

        <FormSelect
          label="Basin"
          name="basin"
          value={state.basin}
          options={BASIN_PRESETS}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Select a BC water basin to display drought level for. &ldquo;Auto&rdquo;
          shows the basin with the highest current drought level. Data is sourced
          from the BC Drought Information Portal via ArcGIS.
        </div>

        <FormSelect
          label="Display Mode"
          name="displayMode"
          value={state.displayMode}
          options={[
            { value: 'single', label: 'Single Basin' },
            { value: 'overview', label: 'Provincial Overview' },
          ]}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Single shows one basin in detail. Overview shows the top basins
          ranked by drought severity.
        </div>
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
          A CORS proxy is required to fetch data from the BC ArcGIS service.
          Without it, mock data will be shown.
        </div>

        <FormInput
          label="Refresh Interval (minutes)"
          name="refreshInterval"
          type="number"
          value={state.refreshInterval}
          min={30}
          max={1440}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Drought levels are updated weekly during drought season (spring to fall).
        </div>
      </div>

      {/* Drought level legend */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">
          Drought Levels
        </h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex justify-between mb-3">
            {droughtLevels.map((d) => (
              <div key={d.level} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: d.color,
                    color: d.level <= 2 ? '#1a1a1a' : '#fff',
                  }}
                >
                  {d.level}
                </div>
                <span className="text-[9px] text-[var(--ui-text-muted)] leading-tight text-center max-w-[48px]">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex">
            {droughtLevels.map((d) => (
              <div
                key={d.level}
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
