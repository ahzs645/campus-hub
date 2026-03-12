'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const DEFAULT_API_URL = 'https://overtheedge.unbc.ca/wp-json/wp/v2/organization?per_page=100&_embed=wp:featuredmedia&org_status=181,183,182';

interface ClubSpotlightData {
  apiUrl: string;
  pageUrl: string;
  rotationSeconds: number;
  corsProxy: string;
  useCorsProxy: boolean;
  refreshMinutes: number;
}

export default function ClubSpotlightOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ClubSpotlightData>({
    apiUrl: (data?.apiUrl as string) ?? DEFAULT_API_URL,
    pageUrl: (data?.pageUrl as string) ?? 'https://overtheedge.unbc.ca/clubs/',
    rotationSeconds: (data?.rotationSeconds as number) ?? 10,
    corsProxy: (data?.corsProxy as string) ?? '',
    useCorsProxy: (data?.useCorsProxy as boolean) ?? true,
    refreshMinutes: (data?.refreshMinutes as number) ?? 30,
  });

  useEffect(() => {
    if (data) {
      setState({
        apiUrl: (data.apiUrl as string) ?? DEFAULT_API_URL,
        pageUrl: (data.pageUrl as string) ?? 'https://overtheedge.unbc.ca/clubs/',
        rotationSeconds: (data.rotationSeconds as number) ?? 10,
        corsProxy: (data.corsProxy as string) ?? '',
        useCorsProxy: (data.useCorsProxy as boolean) ?? true,
        refreshMinutes: (data.refreshMinutes as number) ?? 30,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Data Source</h3>

        <FormInput
          label="WP REST API URL"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder={DEFAULT_API_URL}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          WordPress REST API endpoint for clubs. Fetches club names and featured images as structured JSON.
          Tried first before falling back to HTML scraping.
        </div>

        <FormInput
          label="Clubs Page URL (fallback)"
          name="pageUrl"
          type="url"
          value={state.pageUrl}
          placeholder="https://overtheedge.unbc.ca/clubs/"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Fallback HTML page to scrape if the REST API is unavailable.
        </div>

        <FormSwitch
          label="Use CORS Proxy"
          name="useCorsProxy"
          checked={state.useCorsProxy}
          onChange={handleChange}
        />

        {state.useCorsProxy && (
          <>
            <FormInput
              label="CORS Proxy URL"
              name="corsProxy"
              type="text"
              value={state.corsProxy}
              placeholder="Uses global proxy if empty"
              onChange={handleChange}
            />
            <div className="text-xs text-[var(--ui-text-muted)] text-center">
              A CORS proxy is required to fetch the clubs page from the browser.
              Leave empty to use the global CORS proxy configured in display settings.
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Display Settings</h3>

        <FormInput
          label="Rotation Speed (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={4}
          max={120}
          onChange={handleChange}
        />

        <FormInput
          label="Refresh Interval (minutes)"
          name="refreshMinutes"
          type="number"
          value={state.refreshMinutes}
          min={5}
          max={1440}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-6 flex flex-col items-center">
          <div className="text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--color-accent)' }}>
            Club Spotlight
          </div>
          <div
            className="w-20 h-20 rounded-full border-2 mb-3 bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-primary)]/30"
            style={{ borderColor: 'var(--color-accent)' }}
          />
          <div className="text-sm font-bold text-[var(--ui-text)]">Example Club Name</div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1 rounded-full"
                style={{
                  width: i === 0 ? 16 : 6,
                  backgroundColor: i === 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
