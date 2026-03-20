'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface RSSData {
  feedUrl: string;
  maxItems: number;
  refreshInterval: number;
  showDescription: boolean;
  showDate: boolean;
  scrollSpeed: number;
  title: string;
  corsProxy: string;
}

export default function RSSReaderOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<RSSData>({
    feedUrl: (data?.feedUrl as string) ?? '',
    maxItems: (data?.maxItems as number) ?? 10,
    refreshInterval: (data?.refreshInterval as number) ?? 15,
    showDescription: (data?.showDescription as boolean) ?? true,
    showDate: (data?.showDate as boolean) ?? true,
    scrollSpeed: (data?.scrollSpeed as number) ?? 40,
    title: (data?.title as string) ?? '',
    corsProxy: (data?.corsProxy as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        feedUrl: (data.feedUrl as string) ?? '',
        maxItems: (data.maxItems as number) ?? 10,
        refreshInterval: (data.refreshInterval as number) ?? 15,
        showDescription: (data.showDescription as boolean) ?? true,
        showDate: (data.showDate as boolean) ?? true,
        scrollSpeed: (data.scrollSpeed as number) ?? 40,
        title: (data.title as string) ?? '',
        corsProxy: (data.corsProxy as string) ?? '',
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
      {/* Feed URL */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Feed Source</h3>

        <FormInput
          label="RSS/Atom Feed URL"
          name="feedUrl"
          type="text"
          value={state.feedUrl}
          placeholder="https://example.com/feed.xml"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Leave empty to show demo data. Supports RSS 2.0 and Atom feeds.
        </div>

        <FormInput
          label="Custom Title (optional)"
          name="title"
          type="text"
          value={state.title}
          placeholder="Auto-detected from feed"
          onChange={handleChange}
        />
      </div>

      {/* Display */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Display</h3>

        <FormSelect
          label="Max Items"
          name="maxItems"
          value={String(state.maxItems)}
          options={[
            { value: '5', label: '5 items' },
            { value: '10', label: '10 items' },
            { value: '15', label: '15 items' },
            { value: '20', label: '20 items' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <FormSwitch
          label="Show Description"
          name="showDescription"
          checked={state.showDescription}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Time"
          name="showDate"
          checked={state.showDate}
          onChange={handleChange}
        />

        <FormSelect
          label="Scroll Speed"
          name="scrollSpeed"
          value={String(state.scrollSpeed)}
          options={[
            { value: '20', label: 'Fast' },
            { value: '40', label: 'Normal' },
            { value: '60', label: 'Slow' },
            { value: '0', label: 'No scroll' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
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

      {/* CORS Proxy */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">CORS Proxy</h3>

        <FormInput
          label="Proxy URL (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="Use global setting"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Most RSS feeds require a CORS proxy to load from the browser. Leave empty to use the global proxy setting.
        </div>
      </div>
    </div>
  );
}
