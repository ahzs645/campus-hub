'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';
import type { Milestone } from './Countdown';

type UnitVisibility = 'auto' | 'show' | 'hide';

interface CountdownData {
  milestones: Milestone[];
  rotationSeconds: number;
  hideCompleted: boolean;
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

function parseMilestones(data: Record<string, unknown> | undefined): Milestone[] {
  if (!data) return [];
  // Support new milestones array
  if (Array.isArray(data.milestones) && data.milestones.length > 0) {
    return data.milestones as Milestone[];
  }
  // Migrate legacy single-event config
  if (data.targetDate && typeof data.targetDate === 'string' && data.targetDate.trim()) {
    return [{
      label: (data.eventName as string)?.trim() || '',
      date: (data.targetDate as string).trim(),
      time: (data.targetTime as string)?.trim() || '00:00',
    }];
  }
  return [];
}

export default function CountdownOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<CountdownData>(() => ({
    milestones: parseMilestones(data),
    rotationSeconds: (data?.rotationSeconds as number) ?? 8,
    hideCompleted: (data?.hideCompleted as boolean) ?? true,
    showYears: (data?.showYears as UnitVisibility) ?? 'auto',
    showDays: (data?.showDays as UnitVisibility) ?? 'auto',
    showHours: (data?.showHours as UnitVisibility) ?? 'auto',
    showMinutes: (data?.showMinutes as UnitVisibility) ?? 'auto',
    showSeconds: (data?.showSeconds as UnitVisibility) ?? 'auto',
    showMilliseconds: (data?.showMilliseconds as UnitVisibility) ?? 'hide',
  }));

  useEffect(() => {
    if (data) {
      setState({
        milestones: parseMilestones(data),
        rotationSeconds: (data.rotationSeconds as number) ?? 8,
        hideCompleted: (data.hideCompleted as boolean) ?? true,
        showYears: (data.showYears as UnitVisibility) ?? 'auto',
        showDays: (data.showDays as UnitVisibility) ?? 'auto',
        showHours: (data.showHours as UnitVisibility) ?? 'auto',
        showMinutes: (data.showMinutes as UnitVisibility) ?? 'auto',
        showSeconds: (data.showSeconds as UnitVisibility) ?? 'auto',
        showMilliseconds: (data.showMilliseconds as UnitVisibility) ?? 'hide',
      });
    }
  }, [data]);

  const emit = (newState: CountdownData) => {
    setState(newState);
    onChange(newState as unknown as Record<string, unknown>);
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    emit({ ...state, [name]: value });
  };

  // Milestone list management
  const addMilestone = () => {
    emit({ ...state, milestones: [...state.milestones, { label: '', date: '', time: '00:00', emoji: '' }] });
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = state.milestones.map((m, i) => i === index ? { ...m, [field]: value } : m);
    emit({ ...state, milestones: updated });
  };

  const removeMilestone = (index: number) => {
    emit({ ...state, milestones: state.milestones.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      {/* Milestones */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Milestones</h3>
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Add one or more events to count down to. The widget will rotate between them.
          If no milestones are set, it defaults to the next New Year.
        </div>

        {state.milestones.map((m, i) => (
          <div key={i} className="border border-[color:var(--ui-item-border)] rounded-lg p-3 space-y-3 relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ui-text-muted)] uppercase">
                Milestone {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeMilestone(i)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 rounded hover:bg-red-400/10"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Label</label>
                <input
                  type="text"
                  value={m.label}
                  placeholder="Finals Week, Graduation..."
                  onChange={e => updateMilestone(i, 'label', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 outline-none transition-colors"
                  style={{ border: '1px solid var(--ui-input-border)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Emoji</label>
                <input
                  type="text"
                  value={m.emoji || ''}
                  placeholder="🎓"
                  onChange={e => updateMilestone(i, 'emoji', e.target.value)}
                  className="w-16 px-2 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] text-center placeholder:text-[var(--ui-text-muted)] focus:ring-2 outline-none transition-colors"
                  style={{ border: '1px solid var(--ui-input-border)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Date</label>
                <input
                  type="date"
                  value={m.date}
                  onChange={e => updateMilestone(i, 'date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] focus:ring-2 outline-none transition-colors"
                  style={{ border: '1px solid var(--ui-input-border)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Time</label>
                <input
                  type="time"
                  value={m.time || '00:00'}
                  onChange={e => updateMilestone(i, 'time', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] focus:ring-2 outline-none transition-colors"
                  style={{ border: '1px solid var(--ui-input-border)' }}
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addMilestone}
          className="w-full py-2 px-4 rounded-lg border border-dashed border-[color:var(--ui-item-border)] text-sm text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:border-[color:var(--ui-text-muted)] transition-colors"
        >
          + Add Milestone
        </button>
      </div>

      {/* Rotation & Hide Completed */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Rotation</h3>

        <FormInput
          label="Rotation Speed (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={3}
          max={60}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          How long each milestone is shown before cycling to the next (3-60s).
        </div>

        <FormSwitch
          label="Hide Completed Milestones"
          name="hideCompleted"
          checked={state.hideCompleted}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Automatically filter out milestones whose date has passed.
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
          {state.milestones.length > 0 && state.milestones[0].label && (
            <div className="text-xs font-semibold tracking-wide uppercase mb-3" style={{ color: 'var(--color-accent)' }}>
              {state.milestones[0].emoji && <span className="mr-1">{state.milestones[0].emoji}</span>}
              {state.milestones[0].label}
              {state.milestones[0].emoji && <span className="ml-1">{state.milestones[0].emoji}</span>}
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
          {/* Preview dot indicators */}
          {state.milestones.length > 1 && (
            <div className="flex gap-1 mt-3">
              {state.milestones.map((_, i) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
