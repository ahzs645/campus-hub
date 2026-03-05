'use client';

import { useState, useEffect } from 'react';
import { FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type ClockAlignment = 'left' | 'center' | 'right';
type ClockVerticalAlignment = 'top' | 'center' | 'bottom';
type ClockStyle = 'digital' | 'analog';

interface ClockData {
  showSeconds: boolean;
  showDate: boolean;
  format24h: boolean;
  alignment: ClockAlignment;
  verticalAlignment: ClockVerticalAlignment;
  style: ClockStyle;
}

function normalizeAlignment(value: unknown): ClockAlignment {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return 'right';
}

function normalizeVerticalAlignment(value: unknown): ClockVerticalAlignment {
  if (value === 'top' || value === 'center' || value === 'bottom') return value;
  return 'top';
}

function normalizeStyle(value: unknown): ClockStyle {
  if (value === 'digital' || value === 'analog') return value;
  return 'digital';
}

export default function ClockOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ClockData>({
    showSeconds: (data?.showSeconds as boolean) ?? false,
    showDate: (data?.showDate as boolean) ?? true,
    format24h: (data?.format24h as boolean) ?? false,
    alignment: normalizeAlignment(data?.alignment),
    verticalAlignment: normalizeVerticalAlignment(data?.verticalAlignment),
    style: normalizeStyle(data?.style),
  });

  useEffect(() => {
    if (data) {
      setState({
        showSeconds: (data.showSeconds as boolean) ?? false,
        showDate: (data.showDate as boolean) ?? true,
        format24h: (data.format24h as boolean) ?? false,
        alignment: normalizeAlignment(data.alignment),
        verticalAlignment: normalizeVerticalAlignment(data.verticalAlignment),
        style: normalizeStyle(data.style),
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const isAnalog = state.style === 'analog';

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

  // Analog preview
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Options</h3>

        <FormSelect
          label="Clock Style"
          name="style"
          value={state.style}
          options={[
            { value: 'digital', label: 'Digital' },
            { value: 'analog', label: 'Analog' },
          ]}
          onChange={handleChange}
        />

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

        {!isAnalog && (
          <FormSwitch
            label="24-Hour Format"
            name="format24h"
            checked={state.format24h}
            onChange={handleChange}
          />
        )}

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
          {isAnalog ? (
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 200 200" className="w-24 h-24">
                <circle cx="100" cy="100" r="95" fill="none" stroke="var(--color-accent)" strokeWidth="2" opacity="0.3" />
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i * 30 - 90) * (Math.PI / 180);
                  const isQ = i % 3 === 0;
                  return (
                    <line
                      key={i}
                      x1={100 + Math.cos(a) * (isQ ? 75 : 80)}
                      y1={100 + Math.sin(a) * (isQ ? 75 : 80)}
                      x2={100 + Math.cos(a) * 88}
                      y2={100 + Math.sin(a) * 88}
                      stroke="var(--color-accent)"
                      strokeWidth={isQ ? 3 : 1.5}
                      strokeLinecap="round"
                      opacity={isQ ? 1 : 0.6}
                    />
                  );
                })}
                <line x1="100" y1="100" x2={100 + Math.cos((hourAngle - 90) * Math.PI / 180) * 50} y2={100 + Math.sin((hourAngle - 90) * Math.PI / 180) * 50} stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" />
                <line x1="100" y1="100" x2={100 + Math.cos((minuteAngle - 90) * Math.PI / 180) * 70} y2={100 + Math.sin((minuteAngle - 90) * Math.PI / 180) * 70} stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
                {state.showSeconds && (
                  <line x1="100" y1="100" x2={100 + Math.cos((secondAngle - 90) * Math.PI / 180) * 78} y2={100 + Math.sin((secondAngle - 90) * Math.PI / 180) * 78} stroke="var(--color-primary)" strokeWidth="1.2" strokeLinecap="round" />
                )}
                <circle cx="100" cy="100" r="4" fill="var(--color-accent)" />
              </svg>
              {state.showDate && (
                <div className="text-xs text-[var(--ui-text-muted)] mt-1">
                  {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
