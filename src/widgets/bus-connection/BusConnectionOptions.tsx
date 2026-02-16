'use client';

import { useState, useEffect } from 'react';
import { FormSwitch, FormSelect, FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface BusConnectionData {
  glow: boolean;
  scrollHeadsigns: boolean;
  pixelPitch: number;
  padding: number;
  proxyUrl: string;
  simulate: boolean;
  simMode: 'weekday' | 'saturday';
  simTime: number;
}

export default function BusConnectionOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<BusConnectionData>({
    glow: (data?.glow as boolean) ?? true,
    scrollHeadsigns: (data?.scrollHeadsigns as boolean) ?? true,
    pixelPitch: (data?.pixelPitch as number) ?? 6,
    padding: (data?.padding as number) ?? 8,
    proxyUrl: (data?.proxyUrl as string) ?? '',
    simulate: (data?.simulate as boolean) ?? false,
    simMode: (data?.simMode as 'weekday' | 'saturday') ?? 'weekday',
    simTime: (data?.simTime as number) ?? 540,
  });

  useEffect(() => {
    if (data) {
      setState({
        glow: (data.glow as boolean) ?? true,
        scrollHeadsigns: (data.scrollHeadsigns as boolean) ?? true,
        pixelPitch: (data.pixelPitch as number) ?? 6,
        padding: (data.padding as number) ?? 8,
        proxyUrl: (data.proxyUrl as string) ?? '',
        simulate: (data.simulate as boolean) ?? false,
        simMode: (data.simMode as 'weekday' | 'saturday') ?? 'weekday',
        simTime: (data.simTime as number) ?? 540,
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

  const handleSimModeChange = (name: string, value: string) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const formatTimeLabel = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
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
          label="Pixel Pitch"
          name="pixelPitch"
          value={String(state.pixelPitch)}
          onChange={handleSelectChange}
          options={[
            { label: 'Fine (4px)', value: '4' },
            { label: 'Medium (6px)', value: '6' },
            { label: 'Coarse (8px)', value: '8' },
            { label: 'Extra Coarse (10px)', value: '10' },
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
          <h3 className="font-semibold text-[var(--ui-text)]">Simulation</h3>

          <FormSwitch
            label="Simulate Schedule"
            name="simulate"
            checked={state.simulate}
            onChange={handleSwitchChange}
          />

          {state.simulate && (
            <>
              <FormSelect
                label="Day Type"
                name="simMode"
                value={state.simMode}
                onChange={handleSimModeChange}
                options={[
                  { label: 'Weekday', value: 'weekday' },
                  { label: 'Saturday', value: 'saturday' },
                ]}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--ui-text)]">
                  Time: {formatTimeLabel(state.simTime)}
                </label>
                <input
                  type="range"
                  min="300"
                  max="1440"
                  step="5"
                  value={state.simTime}
                  onChange={e => {
                    const newState = { ...state, simTime: Number(e.target.value) };
                    setState(newState);
                    onChange(newState);
                  }}
                  className="w-full accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-xs text-[var(--ui-text-muted)]">
                  <span>5 AM</span>
                  <span>9 AM</span>
                  <span>1 PM</span>
                  <span>5 PM</span>
                  <span>9 PM</span>
                  <span>12 AM</span>
                </div>
              </div>

              <p className="text-xs text-[var(--ui-text-muted)]">
                Shows scheduled trips for the selected day and time. Realtime data is disabled during simulation.
              </p>
            </>
          )}
        </div>
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
