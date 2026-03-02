'use client';

import { FormInput, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ConfessionsOptionsState {
  apiUrl: string;
  pageUrl: string;
  maxItems: number;
  rotationSeconds: number;
  cacheTtlSeconds: number;
  corsProxy: string;
  showByline: boolean;
}

const DEFAULTS: ConfessionsOptionsState = {
  apiUrl:
    'https://overtheedge.unbc.ca/wp-json/wp/v2/pages?slug=confession&_fields=id,slug,content.rendered',
  pageUrl: 'https://overtheedge.unbc.ca/confession/',
  maxItems: 10,
  rotationSeconds: 12,
  cacheTtlSeconds: 300,
  corsProxy: '',
  showByline: true,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export default function ConfessionsOptions({ data, onChange }: WidgetOptionsProps) {
  const state: ConfessionsOptionsState = {
    apiUrl: (data?.apiUrl as string) ?? DEFAULTS.apiUrl,
    pageUrl: (data?.pageUrl as string) ?? DEFAULTS.pageUrl,
    maxItems: clamp(toNumber(data?.maxItems, DEFAULTS.maxItems), 1, 50),
    rotationSeconds: clamp(toNumber(data?.rotationSeconds, DEFAULTS.rotationSeconds), 4, 120),
    cacheTtlSeconds: clamp(toNumber(data?.cacheTtlSeconds, DEFAULTS.cacheTtlSeconds), 30, 3600),
    corsProxy: (data?.corsProxy as string) ?? DEFAULTS.corsProxy,
    showByline: (data?.showByline as boolean) ?? DEFAULTS.showByline,
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    const next = {
      ...state,
      [name]: value,
    };

    if (name === 'maxItems') {
      next.maxItems = clamp(toNumber(value, DEFAULTS.maxItems), 1, 50);
    }
    if (name === 'rotationSeconds') {
      next.rotationSeconds = clamp(toNumber(value, DEFAULTS.rotationSeconds), 4, 120);
    }
    if (name === 'cacheTtlSeconds') {
      next.cacheTtlSeconds = clamp(toNumber(value, DEFAULTS.cacheTtlSeconds), 30, 3600);
    }

    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Source</h3>
        <FormInput
          label="WordPress API URL"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder={DEFAULTS.apiUrl}
          onChange={handleChange}
        />
        <FormInput
          label="Fallback Page URL"
          name="pageUrl"
          type="url"
          value={state.pageUrl}
          placeholder={DEFAULTS.pageUrl}
          onChange={handleChange}
        />
        <div className="text-sm text-[var(--ui-text-muted)]">
          The widget first fetches the page from WordPress REST and parses the
          <code className="mx-1">data-confessions</code> payload. If that fails,
          it falls back to the page HTML.
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Display</h3>
        <FormInput
          label="Maximum Confessions"
          name="maxItems"
          type="number"
          value={state.maxItems}
          min={1}
          max={50}
          onChange={handleChange}
        />
        <FormInput
          label="Rotate Every (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={4}
          max={120}
          onChange={handleChange}
        />
        <FormSwitch
          label="Show Confession ID/Byline"
          name="showByline"
          checked={state.showByline}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Caching and CORS</h3>
        <FormInput
          label="Cache TTL (seconds)"
          name="cacheTtlSeconds"
          type="number"
          value={state.cacheTtlSeconds}
          min={30}
          max={3600}
          onChange={handleChange}
        />
        <FormInput
          label="CORS Proxy (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="Leave blank to use global setting"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
