'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface WebData {
  url: string;
  refreshInterval: number;
}

export default function WebOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<WebData>({
    url: (data?.url as string) ?? '',
    refreshInterval: (data?.refreshInterval as number) ?? 0,
  });

  useEffect(() => {
    if (data) {
      setState({
        url: (data.url as string) ?? '',
        refreshInterval: (data.refreshInterval as number) ?? 0,
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
      {/* URL Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Web Embed Settings</h3>

        <FormInput
          label="URL"
          name="url"
          type="url"
          value={state.url}
          placeholder="https://example.com"
          onChange={handleChange}
        />

        <FormInput
          label="Refresh Interval (seconds)"
          name="refreshInterval"
          type="number"
          value={state.refreshInterval}
          min={0}
          max={3600}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Set to 0 to disable auto-refresh. Some websites may block embedding.
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl aspect-video flex items-center justify-center">
          {state.url ? (
            <div className="text-center">
              <span className="text-4xl">🌐</span>
              <div className="text-white/70 text-sm mt-2">Web content configured</div>
              <div className="text-white/50 text-xs mt-1 truncate max-w-xs">{state.url}</div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-4xl opacity-50">🌐</span>
              <div className="text-white/50 text-sm mt-2">No URL configured</div>
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="bg-[var(--ui-accent-soft)] border border-[var(--ui-accent-strong)] rounded-lg p-4">
        <div className="flex gap-2">
          <span>⚠️</span>
          <div className="text-sm text-[var(--color-accent)]">
            <strong>Note:</strong> Some websites block embedding in iframes for security reasons.
            If the content doesn&apos;t load, the website may not allow embedding.
          </div>
        </div>
      </div>
    </div>
  );
}
