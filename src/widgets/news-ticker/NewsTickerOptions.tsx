'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface NewsTickerData {
  label: string;
  speed: number;
  apiUrl: string;
}

export default function NewsTickerOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<NewsTickerData>({
    label: (data?.label as string) ?? 'Breaking',
    speed: (data?.speed as number) ?? 30,
    apiUrl: (data?.apiUrl as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        label: (data.label as string) ?? 'Breaking',
        speed: (data.speed as number) ?? 30,
        apiUrl: (data.apiUrl as string) ?? '',
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
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Ticker Settings</h3>

        <div className="space-y-4">
          <FormInput
            label="Label Text"
            name="label"
            type="text"
            value={state.label}
            placeholder="Breaking"
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
        </div>

        <div className="text-sm text-[var(--ui-text-muted)] text-center">
          Lower values = faster scrolling. The ticker will complete one full scroll in {state.speed} seconds.
        </div>
      </div>

      {/* API Configuration */}
      <div className="space-y-4 border-t border-[var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Data Source</h3>

        <FormInput
          label="API URL (optional)"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder="https://api.example.com/announcements"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)] text-center">
          Leave empty to use default sample announcements. The API should return:
          <code className="block mt-2 p-2 bg-[var(--ui-item-bg)] rounded text-xs text-left max-w-md mx-auto">
            {`[{ "label": "WEATHER", "text": "Rain expected..." }]`}
          </code>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">Preview</h4>
        <div className="bg-[var(--color-accent)] rounded-xl overflow-hidden max-w-lg mx-auto">
          <div className="flex items-center">
            <div className="bg-[var(--color-primary)] text-[var(--color-accent)] px-4 py-2 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="animate-pulse">●</span>
              {state.label}
            </div>
            <div className="px-4 py-2 text-[var(--color-primary)] font-medium text-sm whitespace-nowrap overflow-hidden">
              Library closes at 10PM tonight • Rain expected this afternoon • Basketball finals Saturday
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
