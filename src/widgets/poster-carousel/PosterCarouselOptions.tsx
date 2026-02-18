'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type DataSource = 'default' | 'api' | 'unbc-news';

interface PosterCarouselData {
  rotationSeconds: number;
  dataSource: DataSource;
  apiUrl: string;
  maxStories: number;
  corsProxy: string;
  refreshInterval: number;
}

export default function PosterCarouselOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<PosterCarouselData>({
    rotationSeconds: (data?.rotationSeconds as number) ?? 10,
    dataSource: (data?.dataSource as DataSource) ?? 'default',
    apiUrl: (data?.apiUrl as string) ?? '',
    maxStories: (data?.maxStories as number) ?? 5,
    corsProxy: (data?.corsProxy as string) ?? '',
    refreshInterval: (data?.refreshInterval as number) ?? 30,
  });

  useEffect(() => {
    if (data) {
      setState({
        rotationSeconds: (data.rotationSeconds as number) ?? 10,
        dataSource: (data.dataSource as DataSource) ?? 'default',
        apiUrl: (data.apiUrl as string) ?? '',
        maxStories: (data.maxStories as number) ?? 5,
        corsProxy: (data.corsProxy as string) ?? '',
        refreshInterval: (data.refreshInterval as number) ?? 30,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const isUNBC = state.dataSource === 'unbc-news';
  const isAPI = state.dataSource === 'api';

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Carousel Settings</h3>

        <FormInput
          label="Rotation Speed (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={3}
          max={60}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Each poster will display for {state.rotationSeconds} seconds before transitioning to the next.
        </div>
      </div>

      {/* Data Source */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Data Source</h3>

        <FormSelect
          label="Source"
          name="dataSource"
          value={state.dataSource}
          options={[
            { value: 'default', label: 'Default Posters' },
            { value: 'api', label: 'JSON API' },
            { value: 'unbc-news', label: 'UNBC News Releases' },
          ]}
          onChange={handleChange}
        />

        {isUNBC && (
          <div className="text-sm text-[var(--ui-text-muted)]">
            Displays the latest news stories from the UNBC media releases page, with images and dates.
          </div>
        )}
      </div>

      {/* API Configuration - only for JSON API mode */}
      {isAPI && (
        <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
          <h3 className="font-semibold text-[var(--ui-text)]">API Configuration</h3>

          <FormInput
            label="API URL"
            name="apiUrl"
            type="url"
            value={state.apiUrl}
            placeholder="https://api.example.com/posters"
            onChange={handleChange}
          />

          <div className="text-sm text-[var(--ui-text-muted)]">
            The API should return an array of objects with:
            <code className="block mt-2 p-2 bg-[var(--ui-item-bg)] rounded text-xs">
              {`[{ "title": "...", "subtitle": "...", "image": "url" }]`}
            </code>
          </div>
        </div>
      )}

      {/* UNBC News Settings */}
      {isUNBC && (
        <>
          <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
            <h3 className="font-semibold text-[var(--ui-text)]">News Settings</h3>

            <FormInput
              label="Number of Stories"
              name="maxStories"
              type="number"
              value={state.maxStories}
              min={1}
              max={20}
              onChange={handleChange}
            />

            <FormSelect
              label="Refresh Interval"
              name="refreshInterval"
              value={String(state.refreshInterval)}
              options={[
                { value: '10', label: '10 minutes' },
                { value: '30', label: '30 minutes' },
                { value: '60', label: '1 hour' },
                { value: '120', label: '2 hours' },
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
              Required to fetch the UNBC news page from the browser.
            </div>
          </div>
        </>
      )}

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4 aspect-video relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop"
            alt="Sample poster"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="text-2xl font-bold text-white">
              {isUNBC ? 'Latest UNBC Story' : 'Sample Event'}
            </div>
            <div className="text-sm text-white/80">
              {isUNBC ? 'Feb 17, 2026' : 'March 15-17 | Main Quad'}
            </div>
          </div>
          <div className="absolute top-2 left-2 right-2 h-1 bg-black/30 rounded">
            <div className="h-full w-1/3 bg-[var(--color-accent)] rounded" />
          </div>
          {isUNBC && (
            <div className="absolute top-4 left-4 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white/90 bg-black/40 backdrop-blur-sm">
              UNBC News
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
