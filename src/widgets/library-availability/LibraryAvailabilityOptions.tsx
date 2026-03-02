'use client';

import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type DisplayMode = 'grid' | 'calendar' | 'cards';

interface LibraryAvailabilityData {
  title: string;
  mode: DisplayMode;
  endpoint: string;
  lid: number;
  gid: number;
  pageSize: number;
  daysToShow: number;
  rotationSeconds: number;
  refreshSeconds: number;
  openHour: number;
  closeHour: number;
  corsProxy: string;
}

const DEFAULTS: LibraryAvailabilityData = {
  title: 'Library Study Room Availability',
  mode: 'grid',
  endpoint: 'https://unbc.libcal.com/spaces/availability/grid',
  lid: 1637,
  gid: 2928,
  pageSize: 99,
  daysToShow: 3,
  rotationSeconds: 8,
  refreshSeconds: 120,
  openHour: 8,
  closeHour: 23,
  corsProxy: '',
};

export default function LibraryAvailabilityOptions({ data, onChange }: WidgetOptionsProps) {
  const state: LibraryAvailabilityData = {
    title: (data?.title as string) ?? DEFAULTS.title,
    mode: (data?.mode as DisplayMode) ?? DEFAULTS.mode,
    endpoint: (data?.endpoint as string) ?? DEFAULTS.endpoint,
    lid: (data?.lid as number) ?? DEFAULTS.lid,
    gid: (data?.gid as number) ?? DEFAULTS.gid,
    pageSize: (data?.pageSize as number) ?? DEFAULTS.pageSize,
    daysToShow: (data?.daysToShow as number) ?? DEFAULTS.daysToShow,
    rotationSeconds: (data?.rotationSeconds as number) ?? DEFAULTS.rotationSeconds,
    refreshSeconds: (data?.refreshSeconds as number) ?? DEFAULTS.refreshSeconds,
    openHour: (data?.openHour as number) ?? DEFAULTS.openHour,
    closeHour: (data?.closeHour as number) ?? DEFAULTS.closeHour,
    corsProxy: (data?.corsProxy as string) ?? DEFAULTS.corsProxy,
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    const next = { ...state, [name]: value };
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display</h3>

        <FormInput
          label="Widget Title"
          name="title"
          type="text"
          value={state.title}
          onChange={handleChange}
        />

        <FormSelect
          label="Mode"
          name="mode"
          value={state.mode}
          options={[
            { value: 'grid', label: 'Time Grid (room x half-hour)' },
            { value: 'calendar', label: 'Calendar Summary (room x day)' },
            { value: 'cards', label: 'Room Cards' },
          ]}
          onChange={handleChange}
        />

        <FormInput
          label="Days to Fetch"
          name="daysToShow"
          type="number"
          value={state.daysToShow}
          min={1}
          max={22}
          onChange={handleChange}
        />

        <FormInput
          label="Page Rotation (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={2}
          max={120}
          onChange={handleChange}
        />

        <FormInput
          label="Refresh Interval (seconds)"
          name="refreshSeconds"
          type="number"
          value={state.refreshSeconds}
          min={30}
          max={3600}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Library Hours</h3>

        <FormInput
          label="Open Hour (24h)"
          name="openHour"
          type="number"
          value={state.openHour}
          min={0}
          max={23}
          onChange={handleChange}
        />

        <FormInput
          label="Close Hour (24h)"
          name="closeHour"
          type="number"
          value={state.closeHour}
          min={1}
          max={24}
          onChange={handleChange}
        />

        <div className="text-xs text-[var(--ui-text-muted)]">
          The default campus setup is 08:00 to 23:00 with 30-minute slots.
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">LibCal Endpoint</h3>

        <FormInput
          label="Endpoint URL"
          name="endpoint"
          type="url"
          value={state.endpoint}
          onChange={handleChange}
        />

        <FormInput
          label="Library ID (lid)"
          name="lid"
          type="number"
          value={state.lid}
          min={1}
          onChange={handleChange}
        />

        <FormInput
          label="Group ID (gid)"
          name="gid"
          type="number"
          value={state.gid}
          min={1}
          onChange={handleChange}
        />

        <FormInput
          label="pageSize"
          name="pageSize"
          type="number"
          value={state.pageSize}
          min={1}
          max={500}
          onChange={handleChange}
        />

        <FormInput
          label="CORS Proxy (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://your-proxy.example.com"
          onChange={handleChange}
        />

        <div className="text-xs text-[var(--ui-text-muted)] space-y-1">
          <p>Requires POST form fields: lid, gid, start, end, pageSize.</p>
          <p>If this widget runs on another domain, set a CORS proxy.</p>
        </div>
      </div>
    </div>
  );
}
