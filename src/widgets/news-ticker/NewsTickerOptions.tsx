'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface NewsTickerData {
  label: string;
  speed: number;
  scale: number;
  dataSource: 'announcements' | 'events';
  apiUrl: string;
  sourceType: 'json' | 'rss';
  corsProxy: string;
  cacheTtlSeconds: number;
  eventApiUrl: string;
  eventSourceType: 'json' | 'ical' | 'rss';
  eventCorsProxy: string;
  eventCacheTtlSeconds: number;
  eventMaxItems: number;
}

const EVENT_DOT_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];
const clampScale = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(2, Math.max(0.5, value));
};

export default function NewsTickerOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<NewsTickerData>({
    label: (data?.label as string) ?? 'Breaking',
    speed: (data?.speed as number) ?? 30,
    scale: clampScale(data?.scale),
    dataSource: (data?.dataSource as 'announcements' | 'events') ?? 'announcements',
    apiUrl: (data?.apiUrl as string) ?? '',
    sourceType: (data?.sourceType as 'json' | 'rss') ?? 'json',
    corsProxy: (data?.corsProxy as string) ?? '',
    cacheTtlSeconds: (data?.cacheTtlSeconds as number) ?? 120,
    eventApiUrl: (data?.eventApiUrl as string) ?? '',
    eventSourceType: (data?.eventSourceType as 'json' | 'ical' | 'rss') ?? 'json',
    eventCorsProxy: (data?.eventCorsProxy as string) ?? '',
    eventCacheTtlSeconds: (data?.eventCacheTtlSeconds as number) ?? 300,
    eventMaxItems: (data?.eventMaxItems as number) ?? 10,
  });

  useEffect(() => {
    if (data) {
      setState({
        label: (data.label as string) ?? 'Breaking',
        speed: (data.speed as number) ?? 30,
        scale: clampScale(data.scale),
        dataSource: (data.dataSource as 'announcements' | 'events') ?? 'announcements',
        apiUrl: (data.apiUrl as string) ?? '',
        sourceType: (data.sourceType as 'json' | 'rss') ?? 'json',
        corsProxy: (data.corsProxy as string) ?? '',
        cacheTtlSeconds: (data.cacheTtlSeconds as number) ?? 120,
        eventApiUrl: (data.eventApiUrl as string) ?? '',
        eventSourceType: (data.eventSourceType as 'json' | 'ical' | 'rss') ?? 'json',
        eventCorsProxy: (data.eventCorsProxy as string) ?? '',
        eventCacheTtlSeconds: (data.eventCacheTtlSeconds as number) ?? 300,
        eventMaxItems: (data.eventMaxItems as number) ?? 10,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const nextValue = name === 'scale' ? clampScale(value) : value;
    const newState = { ...state, [name]: nextValue };
    setState(newState);
    onChange(newState);
  };

  const isEvents = state.dataSource === 'events';

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Ticker Settings</h3>

        <FormSelect
          label="Data Source"
          name="dataSource"
          value={state.dataSource}
          options={[
            { value: 'announcements', label: 'Announcements' },
            { value: 'events', label: 'Calendar Events' },
          ]}
          onChange={handleChange}
        />

        <div className="space-y-4">
          <FormInput
            label="Label Text"
            name="label"
            type="text"
            value={state.label}
            placeholder={isEvents ? 'Events' : 'Breaking'}
            onChange={handleChange}
          />

          <FormInput
            label="Scroll Speed (seconds)"
            name="speed"
            type="number"
            value={state.speed}
            min={10}
            max={120}
            onChange={handleChange}
          />

          <FormInput
            label="Size Scale"
            name="scale"
            type="number"
            value={state.scale}
            min={0.5}
            max={2}
            step={0.05}
            onChange={handleChange}
          />
        </div>

        <div className="text-sm text-[var(--ui-text-muted)] text-center">
          Lower values = faster scrolling. The ticker will complete one full scroll in {state.speed} seconds.
        </div>
        <div className="text-sm text-[var(--ui-text-muted)] text-center">
          Scale {state.scale.toFixed(2)}x. Use 1.00x for default sizing.
        </div>
      </div>

      {/* Data Source Configuration */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          {isEvents ? 'Events Source' : 'Data Source'}
        </h3>

        {isEvents ? (
          <>
            <FormSelect
              label="Source Type"
              name="eventSourceType"
              value={state.eventSourceType}
              options={[
                { value: 'json', label: 'JSON API' },
                { value: 'ical', label: 'iCal (Google/Outlook)' },
                { value: 'rss', label: 'RSS Feed' },
              ]}
              onChange={handleChange}
            />

            <FormInput
              label="Events API URL (optional)"
              name="eventApiUrl"
              type="url"
              value={state.eventApiUrl}
              placeholder="https://api.example.com/events"
              onChange={handleChange}
            />

            <FormInput
              label="CORS Proxy (optional)"
              name="eventCorsProxy"
              type="text"
              value={state.eventCorsProxy}
              placeholder="https://r.jina.ai/http://"
              onChange={handleChange}
            />

            <FormInput
              label="Cache TTL (seconds)"
              name="eventCacheTtlSeconds"
              type="number"
              value={state.eventCacheTtlSeconds}
              min={30}
              max={3600}
              onChange={handleChange}
            />

            <FormInput
              label="Maximum Events"
              name="eventMaxItems"
              type="number"
              value={state.eventMaxItems}
              min={1}
              max={20}
              onChange={handleChange}
            />

            <div className="text-sm text-[var(--ui-text-muted)] text-center">
              Leave empty to use default sample events. Uses the same data format as the Events List widget.
              {state.eventSourceType === 'json' && (
                <code className="block mt-2 p-2 bg-[var(--ui-item-bg)] rounded text-xs text-left max-w-md mx-auto">
                  {`[{ "title": "...", "date": "Mar 10", "time": "11:00 AM", "location": "..." }]`}
                </code>
              )}
              {state.eventSourceType === 'ical' && (
                <div className="mt-2 text-xs">
                  Use a public iCal URL (Google/Outlook calendars can export this).
                </div>
              )}
              {state.eventSourceType === 'rss' && (
                <div className="mt-2 text-xs">
                  RSS items are mapped into events using the item title and publish date.
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <FormSelect
              label="Source Type"
              name="sourceType"
              value={state.sourceType}
              options={[
                { value: 'json', label: 'JSON API' },
                { value: 'rss', label: 'RSS Feed' },
              ]}
              onChange={handleChange}
            />

            <FormInput
              label="API URL (optional)"
              name="apiUrl"
              type="url"
              value={state.apiUrl}
              placeholder="https://api.example.com/announcements"
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

            <div className="text-sm text-[var(--ui-text-muted)] text-center">
              Leave empty to use default sample announcements.
              {state.sourceType === 'json' && (
                <code className="block mt-2 p-2 bg-[var(--ui-item-bg)] rounded text-xs text-left max-w-md mx-auto">
                  {`[{ "label": "WEATHER", "text": "Rain expected..." }]`}
                </code>
              )}
              {state.sourceType === 'rss' && (
                <div className="mt-2 text-xs">
                  RSS items are mapped into ticker items using the item title.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">Preview</h4>
        <div className="bg-[var(--color-accent)] rounded-xl overflow-hidden max-w-lg mx-auto">
          <div className="flex items-center">
            <div className="bg-[var(--color-primary)] text-[var(--color-accent)] px-4 py-2 font-bold text-sm uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
              <span className="animate-pulse">●</span>
              {state.label}
            </div>
            {isEvents ? (
              <div className="px-4 py-2 flex items-center gap-3 overflow-hidden">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--color-primary)] text-[var(--color-accent)] whitespace-nowrap">
                  11:00 AM
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EVENT_DOT_COLORS[0] }}
                />
                <span className="text-[var(--color-primary)] font-medium text-sm whitespace-nowrap">
                  Club Fair
                </span>
                <span className="text-[var(--color-primary)] opacity-40">&bull;</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[var(--color-primary)] text-[var(--color-accent)] whitespace-nowrap">
                  2:00 PM
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EVENT_DOT_COLORS[1] }}
                />
                <span className="text-[var(--color-primary)] font-medium text-sm whitespace-nowrap">
                  Guest Lecture
                </span>
              </div>
            ) : (
              <div className="px-4 py-2 text-[var(--color-primary)] font-medium text-sm whitespace-nowrap overflow-hidden">
                Library closes at 10PM tonight &bull; Rain expected this afternoon &bull; Basketball finals Saturday
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
