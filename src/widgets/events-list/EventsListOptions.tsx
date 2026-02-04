'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface EventsListData {
  title: string;
  maxItems: number;
  apiUrl: string;
  sourceType: 'json' | 'ical' | 'rss';
  corsProxy: string;
  cacheTtlSeconds: number;
}

export default function EventsListOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<EventsListData>({
    title: (data?.title as string) ?? 'Upcoming Events',
    maxItems: (data?.maxItems as number) ?? 10,
    apiUrl: (data?.apiUrl as string) ?? '',
    sourceType: (data?.sourceType as 'json' | 'ical' | 'rss') ?? 'json',
    corsProxy: (data?.corsProxy as string) ?? '',
    cacheTtlSeconds: (data?.cacheTtlSeconds as number) ?? 300,
  });

  useEffect(() => {
    if (data) {
      setState({
        title: (data.title as string) ?? 'Upcoming Events',
        maxItems: (data.maxItems as number) ?? 10,
        apiUrl: (data.apiUrl as string) ?? '',
        sourceType: (data.sourceType as 'json' | 'ical' | 'rss') ?? 'json',
        corsProxy: (data.corsProxy as string) ?? '',
        cacheTtlSeconds: (data.cacheTtlSeconds as number) ?? 300,
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
        <h3 className="font-semibold text-[var(--ui-text)]">Display Settings</h3>

        <FormInput
          label="Widget Title"
          name="title"
          type="text"
          value={state.title}
          placeholder="Upcoming Events"
          onChange={handleChange}
        />

        <FormInput
          label="Maximum Items"
          name="maxItems"
          type="number"
          value={state.maxItems}
          min={1}
          max={20}
          onChange={handleChange}
        />
      </div>

      {/* API Configuration */}
      <div className="space-y-4 border-t border-[var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Data Source</h3>

        <FormSelect
          label="Source Type"
          name="sourceType"
          value={state.sourceType}
          options={[
            { value: 'json', label: 'JSON API' },
            { value: 'ical', label: 'iCal (Google/Outlook)' },
            { value: 'rss', label: 'RSS Feed' },
          ]}
          onChange={handleChange}
        />

        <FormInput
          label="API URL (optional)"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder="https://api.example.com/events"
          onChange={handleChange}
        />

        <FormInput
          label="CORS Proxy (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://r.jina.ai/http://"
          onChange={handleChange}
        />

        <FormInput
          label="Cache TTL (seconds)"
          name="cacheTtlSeconds"
          type="number"
          value={state.cacheTtlSeconds}
          min={30}
          max={3600}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Leave empty to use default sample events.
          {state.sourceType === 'json' && (
            <code className="block mt-2 p-2 bg-[var(--ui-item-bg)] rounded text-xs">
              {`[{ "title": "...", "date": "Mar 10", "time": "11:00 AM", "location": "..." }]`}
            </code>
          )}
          {state.sourceType === 'ical' && (
            <div className="mt-2 text-xs">
              Use a public iCal URL (Google/Outlook calendars can export this).
            </div>
          )}
          {state.sourceType === 'rss' && (
            <div className="mt-2 text-xs">
              RSS items are mapped into events using the item title and publish date.
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[var(--color-accent)] mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-bold">{state.title}</span>
          </div>
          <div className="space-y-2">
            {['Club Fair', 'Guest Lecture', 'Open Mic Night'].slice(0, Math.min(3, state.maxItems)).map((event, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/10 border-l-2 border-[var(--color-accent)]">
                <div className="text-white text-sm font-medium">{event}</div>
                <div className="text-white/60 text-xs">Mar {10 + i} • 11:00 AM</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
