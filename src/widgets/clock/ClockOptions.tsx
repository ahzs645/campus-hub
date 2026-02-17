'use client';

import { useState, useEffect } from 'react';
import { FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type ClockAlignment = 'left' | 'center' | 'right';
type ClockVerticalAlignment = 'top' | 'center' | 'bottom';

interface ClockData {
  showSeconds: boolean;
  showDate: boolean;
  format24h: boolean;
  alignment: ClockAlignment;
  verticalAlignment: ClockVerticalAlignment;
}

function normalizeAlignment(value: unknown): ClockAlignment {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return 'right';
}

function normalizeVerticalAlignment(value: unknown): ClockVerticalAlignment {
  if (value === 'top' || value === 'center' || value === 'bottom') return value;
  return 'top';
}

export default function ClockOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ClockData>({
    showSeconds: (data?.showSeconds as boolean) ?? false,
    showDate: (data?.showDate as boolean) ?? true,
    format24h: (data?.format24h as boolean) ?? false,
    alignment: normalizeAlignment(data?.alignment),
    verticalAlignment: normalizeVerticalAlignment(data?.verticalAlignment),
  });

  useEffect(() => {
    if (data) {
      setState({
        showSeconds: (data.showSeconds as boolean) ?? false,
        showDate: (data.showDate as boolean) ?? true,
        format24h: (data.format24h as boolean) ?? false,
        alignment: normalizeAlignment(data.alignment),
        verticalAlignment: normalizeVerticalAlignment(data.verticalAlignment),
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | boolean) => {
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
  const previewAlignmentClass =
    state.alignment === 'left'
      ? 'text-left'
      : state.alignment === 'center'
        ? 'text-center'
        : 'text-right';
  const previewVerticalAlignmentClass =
    state.verticalAlignment === 'top'
      ? 'justify-start'
      : state.verticalAlignment === 'center'
        ? 'justify-center'
        : 'justify-end';

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Options</h3>

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

        <FormSelect
          label="Alignment"
          name="alignment"
          value={state.alignment}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={handleChange}
        />

        <FormSelect
          label="Vertical Alignment"
          name="verticalAlignment"
          value={state.verticalAlignment}
          options={[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'bottom', label: 'Bottom' },
          ]}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div
          className={`bg-[var(--ui-item-bg)] rounded-xl p-6 h-32 flex flex-col ${previewAlignmentClass} ${previewVerticalAlignmentClass}`}
        >
          <div className="text-4xl font-bold text-[var(--color-accent)] font-mono">
            {now.toLocaleTimeString([], timeOptions)}
          </div>
          {state.showDate && (
            <div className="text-sm text-[var(--ui-text-muted)] mt-1">
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
