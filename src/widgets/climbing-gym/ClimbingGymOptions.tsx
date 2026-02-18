'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import AppIcon from '@/components/AppIcon';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ClimbingGymData {
  gymName: string;
  portalUrl: string;
  refreshInterval: number;
  corsProxy: string;
  showCapacityBar: boolean;
  showHours: boolean;
}

const DEFAULT_PORTAL_URL =
  'https://portal.rockgympro.com/portal/public/e4f8e07377b8d1ba053944154f4c2c50/occupancy?&iframeid=occupancyCounter&fId=';

export default function ClimbingGymOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ClimbingGymData>({
    gymName: (data?.gymName as string) ?? 'OVERhang',
    portalUrl: (data?.portalUrl as string) ?? DEFAULT_PORTAL_URL,
    refreshInterval: (data?.refreshInterval as number) ?? 5,
    corsProxy: (data?.corsProxy as string) ?? '',
    showCapacityBar: (data?.showCapacityBar as boolean) ?? true,
    showHours: (data?.showHours as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        gymName: (data.gymName as string) ?? 'OVERhang',
        portalUrl: (data.portalUrl as string) ?? DEFAULT_PORTAL_URL,
        refreshInterval: (data.refreshInterval as number) ?? 5,
        corsProxy: (data.corsProxy as string) ?? '',
        showCapacityBar: (data.showCapacityBar as boolean) ?? true,
        showHours: (data.showHours as boolean) ?? true,
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
      {/* Gym Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Gym Settings</h3>

        <FormInput
          label="Gym Name"
          name="gymName"
          type="text"
          value={state.gymName}
          placeholder="OVERhang"
          onChange={handleChange}
        />

        <FormInput
          label="Rock Gym Pro Portal URL"
          name="portalUrl"
          type="text"
          value={state.portalUrl}
          placeholder={DEFAULT_PORTAL_URL}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          The public occupancy iframe URL from Rock Gym Pro. Default is set to OVERhang Climbing Gym.
        </div>
      </div>

      {/* Display */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Display</h3>

        <FormSwitch
          label="Show Capacity Bar"
          name="showCapacityBar"
          checked={state.showCapacityBar}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Hours & Open/Closed Status"
          name="showHours"
          checked={state.showHours}
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
            { value: '2', label: '2 minutes' },
            { value: '5', label: '5 minutes' },
            { value: '10', label: '10 minutes' },
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
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
          Required to fetch occupancy data from the browser. The portal URL is appended to this proxy.
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-accent)] mb-1">
            {state.gymName}
          </div>
          <div className="flex items-center gap-3">
            <AppIcon name="mountain" className="w-8 h-8 text-white/80" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold" style={{ color: '#22c55e' }}>12</span>
                <span className="text-sm text-white/50">/ 30</span>
              </div>
              <div className="text-xs text-white/70">Current Climber Count</div>
            </div>
          </div>
          {state.showCapacityBar && (
            <div className="mt-2">
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: '40%', backgroundColor: '#22c55e' }}
                />
              </div>
              <div className="flex justify-between mt-0.5 text-[10px] text-white/40">
                <span>40% full</span>
                <span>Not busy</span>
              </div>
            </div>
          )}
          {state.showHours && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="font-medium text-green-500">Open</span>
              <span className="text-white/40">Closes at 10:00 PM</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
