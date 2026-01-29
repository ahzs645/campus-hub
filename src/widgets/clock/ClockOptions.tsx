'use client';

import { useState, useEffect } from 'react';
import { FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ClockData {
  showSeconds: boolean;
  showDate: boolean;
  format24h: boolean;
}

export default function ClockOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ClockData>({
    showSeconds: (data?.showSeconds as boolean) ?? false,
    showDate: (data?.showDate as boolean) ?? true,
    format24h: (data?.format24h as boolean) ?? false,
  });

  useEffect(() => {
    if (data) {
      setState({
        showSeconds: (data.showSeconds as boolean) ?? false,
        showDate: (data.showDate as boolean) ?? true,
        format24h: (data.format24h as boolean) ?? false,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  // Preview time
  const now = new Date();
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(state.showSeconds ? { second: '2-digit' } : {}),
    hour12: !state.format24h,
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Display Options</h3>

        <FormSwitch
          label="Show Seconds"
          name="showSeconds"
          checked={state.showSeconds}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Date"
          name="showDate"
          checked={state.showDate}
          onChange={handleChange}
        />

        <FormSwitch
          label="24-Hour Format"
          name="format24h"
          checked={state.format24h}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
        <div className="bg-gray-900 rounded-xl p-6 text-right">
          <div className="text-4xl font-bold text-amber-500 font-mono">
            {now.toLocaleTimeString([], timeOptions)}
          </div>
          {state.showDate && (
            <div className="text-sm text-gray-400 mt-1">
              {now.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
