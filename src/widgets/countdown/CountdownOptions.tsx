'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type UnitVisibility = 'auto' | 'show' | 'hide';

interface CountdownData {
  targetDate: string;
  targetTime: string;
  eventName: string;
  showYears: UnitVisibility;
  showDays: UnitVisibility;
  showHours: UnitVisibility;
  showMinutes: UnitVisibility;
  showSeconds: UnitVisibility;
  showMilliseconds: UnitVisibility;
}

const VISIBILITY_OPTIONS = [
  { value: 'auto', label: 'Auto (show when relevant)' },
  { value: 'show', label: 'Always show' },
  { value: 'hide', label: 'Always hide' },
];

export default function CountdownOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<CountdownData>({
    targetDate: (data?.targetDate as string) ?? '',
    targetTime: (data?.targetTime as string) ?? '00:00',
    eventName: (data?.eventName as string) ?? '',
    showYears: (data?.showYears as UnitVisibility) ?? 'auto',
    showDays: (data?.showDays as UnitVisibility) ?? 'auto',
    showHours: (data?.showHours as UnitVisibility) ?? 'auto',
    showMinutes: (data?.showMinutes as UnitVisibility) ?? 'auto',
    showSeconds: (data?.showSeconds as UnitVisibility) ?? 'auto',
    showMilliseconds: (data?.showMilliseconds as UnitVisibility) ?? 'hide',
  });

  useEffect(() => {
    if (data) {
      setState({
        targetDate: (data.targetDate as string) ?? '',
        targetTime: (data.targetTime as string) ?? '00:00',
        eventName: (data.eventName as string) ?? '',
        showYears: (data.showYears as UnitVisibility) ?? 'auto',
        showDays: (data.showDays as UnitVisibility) ?? 'auto',
        showHours: (data.showHours as UnitVisibility) ?? 'auto',
        showMinutes: (data.showMinutes as UnitVisibility) ?? 'auto',
        showSeconds: (data.showSeconds as UnitVisibility) ?? 'auto',
        showMilliseconds: (data.showMilliseconds as UnitVisibility) ?? 'hide',
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
      {/* Target */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Target Event</h3>

        <FormInput
          label="Event Name"
          name="eventName"
          type="text"
          value={state.eventName}
          placeholder="Finals Week, Graduation, Spring Break..."
          onChange={handleChange}
        />

        <FormInput
          label="Target Date"
          name="targetDate"
          type="date"
          value={state.targetDate}
          onChange={handleChange}
        />

        <FormInput
          label="Target Time"
          name="targetTime"
          type="time"
          value={state.targetTime}
          onChange={handleChange}
        />

        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Set the date and time to count down to. If no date is set, defaults to the next New Year.
        </div>
      </div>

      {/* Unit Visibility */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Unit Display</h3>
        <div className="text-xs text-[var(--ui-text-muted)] text-center mb-2">
          Choose which time units to display. &quot;Auto&quot; shows units only when they have a non-zero value.
        </div>

        <FormSelect
          label="Years"
          name="showYears"
          value={state.showYears}
          options={VISIBILITY_OPTIONS}
          onChange={handleChange}
        />
        <FormSelect
          label="Days"
          name="showDays"
          value={state.showDays}
          options={VISIBILITY_OPTIONS}
          onChange={handleChange}
        />
        <FormSelect
          label="Hours"
          name="showHours"
          value={state.showHours}
          options={VISIBILITY_OPTIONS}
          onChange={handleChange}
        />
        <FormSelect
          label="Minutes"
          name="showMinutes"
          value={state.showMinutes}
          options={VISIBILITY_OPTIONS}
          onChange={handleChange}
        />
        <FormSelect
          label="Seconds"
          name="showSeconds"
          value={state.showSeconds}
          options={VISIBILITY_OPTIONS}
          onChange={handleChange}
        />
        <FormSelect
          label="Milliseconds"
          name="showMilliseconds"
          value={state.showMilliseconds}
          options={VISIBILITY_OPTIONS}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Enabling milliseconds uses high-frequency updates for smooth counting. Use sparingly for performance.
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-6 flex flex-col items-center">
          {state.eventName && (
            <div className="text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--color-accent)' }}>
              {state.eventName}
            </div>
          )}
          <div className="flex items-center gap-2">
            {[
              { v: '42', l: 'Days' },
              { v: '08', l: 'Hours' },
              { v: '15', l: 'Mins' },
              { v: '33', l: 'Secs' },
            ].map((u, i) => (
              <div key={u.l} className="flex items-center">
                {i > 0 && <span className="text-lg font-bold text-[var(--ui-text-muted)] mx-1">:</span>}
                <div className="flex flex-col items-center">
                  <div className="text-xl font-bold font-mono px-1.5 py-1 rounded bg-black/20 text-[var(--ui-text)]">
                    {u.v}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--color-accent)' }}>
                    {u.l}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
