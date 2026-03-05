'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface AirQualityData {
  dataSource: 'waqi' | 'bc-aqhi';
  waqiToken: string;
  waqiCity: string;
  refreshInterval: number;
  corsProxy: string;
}

export default function AirQualityOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<AirQualityData>({
    dataSource: (data?.dataSource as 'waqi' | 'bc-aqhi') ?? 'waqi',
    waqiToken: (data?.waqiToken as string) ?? '',
    waqiCity: (data?.waqiCity as string) ?? 'prince-george',
    refreshInterval: (data?.refreshInterval as number) ?? 15,
    corsProxy: (data?.corsProxy as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        dataSource: (data.dataSource as 'waqi' | 'bc-aqhi') ?? 'waqi',
        waqiToken: (data.waqiToken as string) ?? '',
        waqiCity: (data.waqiCity as string) ?? 'prince-george',
        refreshInterval: (data.refreshInterval as number) ?? 15,
        corsProxy: (data.corsProxy as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const isWaqi = state.dataSource === 'waqi';

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Data Source</h3>

        <FormSelect
          label="Source"
          name="dataSource"
          value={state.dataSource}
          options={[
            { value: 'waqi', label: 'WAQI / AQICN (Global AQI)' },
            { value: 'bc-aqhi', label: 'BC AQHI (Prince George)' },
          ]}
          onChange={handleChange}
        />

        {isWaqi ? (
          <>
            <FormInput
              label="API Token"
              name="waqiToken"
              type="text"
              value={state.waqiToken}
              placeholder="Get free token from aqicn.org/data-platform/token"
              onChange={handleChange}
            />
            <div className="text-xs text-[var(--ui-text-muted)] text-center">
              Free API token from the World Air Quality Index project. Provides AQI + pollutant breakdown (PM2.5, PM10, O3, etc.).
            </div>

            <FormInput
              label="City / Station"
              name="waqiCity"
              type="text"
              value={state.waqiCity}
              placeholder="prince-george"
              onChange={handleChange}
            />
            <div className="text-xs text-[var(--ui-text-muted)] text-center">
              City name or station ID. Examples: &quot;prince-george&quot;, &quot;vancouver&quot;, &quot;@27586&quot; (UNBC station).
            </div>
          </>
        ) : (
          <>
            <FormInput
              label="CORS Proxy (required)"
              name="corsProxy"
              type="text"
              value={state.corsProxy}
              placeholder="https://r.jina.ai/http://"
              onChange={handleChange}
            />
            <div className="text-xs text-[var(--ui-text-muted)] text-center">
              BC AQHI requires a CORS proxy since the BC government site doesn&apos;t allow cross-origin requests. Uses the AQHI scale (1-10+) specific to BC.
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Settings</h3>

        <FormInput
          label="Refresh Interval (minutes)"
          name="refreshInterval"
          type="number"
          value={state.refreshInterval}
          min={5}
          max={60}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-green-500">
              <span className="text-xl font-bold text-green-950">42</span>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--ui-text)]">Good</div>
              <div className="text-xs text-[var(--ui-text-muted)]">
                {isWaqi ? 'AQI Scale' : 'AQHI Scale'} {isWaqi ? '• PM25' : ''}
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden flex">
            <div className="flex-1 bg-green-500" />
            <div className="flex-1 bg-yellow-400" />
            <div className="flex-1 bg-orange-500" />
            <div className="flex-1 bg-red-500" />
            <div className="flex-1 bg-purple-700" />
            <div className="flex-1 bg-rose-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
