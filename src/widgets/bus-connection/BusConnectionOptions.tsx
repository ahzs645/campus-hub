'use client';

import { useState, useEffect } from 'react';
import { FormSwitch, FormSelect, FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface BusConnectionData {
  glow: boolean;
  scrollHeadsigns: boolean;
  displayHeight: number;
  padding: number;
  proxyUrl: string;
}

export default function BusConnectionOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<BusConnectionData>({
    glow: (data?.glow as boolean) ?? true,
    scrollHeadsigns: (data?.scrollHeadsigns as boolean) ?? true,
    displayHeight: (data?.displayHeight as number) ?? 32,
    padding: (data?.padding as number) ?? 8,
    proxyUrl: (data?.proxyUrl as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        glow: (data.glow as boolean) ?? true,
        scrollHeadsigns: (data.scrollHeadsigns as boolean) ?? true,
        displayHeight: (data.displayHeight as number) ?? 32,
        padding: (data.padding as number) ?? 0,
        proxyUrl: (data.proxyUrl as string) ?? '',
      });
    }
  }, [data]);

  const handleSwitchChange = (name: string, value: boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handleSelectChange = (name: string, value: string) => {
    const newState = { ...state, [name]: Number(value) };
    setState(newState);
    onChange(newState);
  };

  const handleInputChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: String(value) };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Options</h3>

        <FormSwitch
          label="LED Glow Effect"
          name="glow"
          checked={state.glow}
          onChange={handleSwitchChange}
        />

        <FormSwitch
          label="Scroll Long Names"
          name="scrollHeadsigns"
          checked={state.scrollHeadsigns}
          onChange={handleSwitchChange}
        />

        <FormSelect
          label="Display Height"
          name="displayHeight"
          value={String(state.displayHeight)}
          onChange={handleSelectChange}
          options={[
            { label: '128 x 32 (Compact)', value: '32' },
            { label: '128 x 64 (Expanded)', value: '64' },
          ]}
        />

        <FormSelect
          label="Padding"
          name="padding"
          value={String(state.padding)}
          onChange={handleSelectChange}
          options={[
            { label: 'None', value: '0' },
            { label: 'Small (8px)', value: '8' },
            { label: 'Medium (16px)', value: '16' },
            { label: 'Large (24px)', value: '24' },
          ]}
        />
      </div>

      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-[var(--ui-text)]">Live Data</h3>

          <FormInput
            label="GTFS-RT Proxy URL"
            name="proxyUrl"
            value={state.proxyUrl}
            onChange={handleInputChange}
            placeholder="e.g. https://your-proxy.com/gtfs-realtime"
          />

          <p className="text-xs text-[var(--ui-text-muted)]">
            Optional. Provide a CORS-enabled proxy URL to the BC Transit GTFS-Realtime feed for live arrival times. Leave empty to use scheduled times only.
          </p>
        </div>
      </div>

      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">About</h4>
        <div className="text-sm text-[var(--ui-text-muted)] space-y-2">
          <p>Shows upcoming bus arrivals at UNBC Exchange using BC Transit schedule data.</p>
          <p>Routes: 15 (Downtown), 16 (College Heights), 19 (Westgate)</p>
        </div>
      </div>
    </div>
  );
}
