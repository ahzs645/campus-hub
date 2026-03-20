'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface CalendarData {
  calendarId: string;
  apiKey: string;
  maxEvents: number;
  refreshInterval: number;
  showLocation: boolean;
  daysAhead: number;
  title: string;
}

export default function GoogleCalendarOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<CalendarData>({
    calendarId: (data?.calendarId as string) ?? '',
    apiKey: (data?.apiKey as string) ?? '',
    maxEvents: (data?.maxEvents as number) ?? 10,
    refreshInterval: (data?.refreshInterval as number) ?? 15,
    showLocation: (data?.showLocation as boolean) ?? true,
    daysAhead: (data?.daysAhead as number) ?? 7,
    title: (data?.title as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        calendarId: (data.calendarId as string) ?? '',
        apiKey: (data.apiKey as string) ?? '',
        maxEvents: (data.maxEvents as number) ?? 10,
        refreshInterval: (data.refreshInterval as number) ?? 15,
        showLocation: (data.showLocation as boolean) ?? true,
        daysAhead: (data.daysAhead as number) ?? 7,
        title: (data.title as string) ?? '',
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
      {/* Calendar Source */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Calendar Source</h3>

        <FormInput
          label="Calendar ID"
          name="calendarId"
          type="text"
          value={state.calendarId}
          placeholder="example@gmail.com or public calendar ID"
          onChange={handleChange}
        />

        <FormInput
          label="Google API Key"
          name="apiKey"
          type="text"
          value={state.apiKey}
          placeholder="AIza..."
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Leave both empty for demo data. The calendar must be public, or use a service account.
          Get an API key from the Google Cloud Console with Calendar API enabled.
        </div>

        <FormInput
          label="Custom Title (optional)"
          name="title"
          type="text"
          value={state.title}
          placeholder="Auto-detected from calendar"
          onChange={handleChange}
        />
      </div>

      {/* Display */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Display</h3>

        <FormSelect
          label="Max Events"
          name="maxEvents"
          value={String(state.maxEvents)}
          options={[
            { value: '5', label: '5 events' },
            { value: '10', label: '10 events' },
            { value: '15', label: '15 events' },
            { value: '20', label: '20 events' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <FormSelect
          label="Days Ahead"
          name="daysAhead"
          value={String(state.daysAhead)}
          options={[
            { value: '1', label: 'Today only' },
            { value: '3', label: '3 days' },
            { value: '7', label: '1 week' },
            { value: '14', label: '2 weeks' },
            { value: '30', label: '1 month' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <FormSwitch
          label="Show Location"
          name="showLocation"
          checked={state.showLocation}
          onChange={handleChange}
        />
      </div>

      {/* Refresh */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Refresh</h3>

        <FormSelect
          label="Auto-refresh every"
          name="refreshInterval"
          value={String(state.refreshInterval)}
          options={[
            { value: '5', label: '5 minutes' },
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />
      </div>
    </div>
  );
}
