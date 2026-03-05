'use client';

import { FormInput, FormSwitch, FormStepper } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface Milestone {
  label: string;
  date: string;
  emoji?: string;
}

interface CountdownTimerData {
  milestones: Milestone[];
  rotationInterval: number;
  showDays: boolean;
  showHours: boolean;
  showMinutes: boolean;
  showSeconds: boolean;
  hideCompleted: boolean;
}

function parseMilestones(raw: unknown): Milestone[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is Milestone =>
        typeof m === 'object' && m !== null && typeof m.label === 'string' && typeof m.date === 'string',
    )
    .map((m) => ({
      label: m.label,
      date: m.date,
      emoji: typeof m.emoji === 'string' ? m.emoji : undefined,
    }));
}

function parseData(data: Record<string, unknown>): CountdownTimerData {
  return {
    milestones: parseMilestones(data?.milestones),
    rotationInterval: (data?.rotationInterval as number) ?? 10,
    showDays: (data?.showDays as boolean) ?? true,
    showHours: (data?.showHours as boolean) ?? true,
    showMinutes: (data?.showMinutes as boolean) ?? true,
    showSeconds: (data?.showSeconds as boolean) ?? true,
    hideCompleted: (data?.hideCompleted as boolean) ?? true,
  };
}

export default function CountdownTimerOptions({ data, onChange }: WidgetOptionsProps) {
  const state = parseData(data);

  const emit = (newState: CountdownTimerData) => {
    onChange(newState as unknown as Record<string, unknown>);
  };

  const handleToggle = (name: string, value: string | boolean) => {
    emit({ ...state, [name]: value });
  };

  const handleRotationChange = (_name: string, value: string) => {
    emit({ ...state, rotationInterval: Number(value) });
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string) => {
    const updated = [...state.milestones];
    updated[index] = { ...updated[index], [field]: value };
    emit({ ...state, milestones: updated });
  };

  const addMilestone = () => {
    emit({
      ...state,
      milestones: [...state.milestones, { label: '', date: '', emoji: '' }],
    });
  };

  const removeMilestone = (index: number) => {
    emit({
      ...state,
      milestones: state.milestones.filter((_, i) => i !== index),
    });
  };

  const previewMilestones = state.milestones.filter((m) => m.date && m.label);

  return (
    <div className="space-y-6">
      {/* Display Options */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Options</h3>

        <FormSwitch label="Show Days" name="showDays" checked={state.showDays} onChange={handleToggle} />
        <FormSwitch label="Show Hours" name="showHours" checked={state.showHours} onChange={handleToggle} />
        <FormSwitch label="Show Minutes" name="showMinutes" checked={state.showMinutes} onChange={handleToggle} />
        <FormSwitch label="Show Seconds" name="showSeconds" checked={state.showSeconds} onChange={handleToggle} />
        <FormSwitch label="Hide Completed" name="hideCompleted" checked={state.hideCompleted} onChange={handleToggle} />

        <FormStepper
          label="Rotation Interval"
          name="rotationInterval"
          value={state.rotationInterval}
          min={3}
          max={60}
          step={1}
          unit="s"
          onChange={handleRotationChange}
        />
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Milestones</h3>

        {state.milestones.map((milestone, index) => (
          <div
            key={index}
            className="rounded-lg p-3 space-y-2"
            style={{
              backgroundColor: 'var(--ui-item-bg)',
              border: '1px solid var(--ui-item-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--ui-text-muted)]">
                Milestone {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeMilestone(index)}
                className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-400/10 transition-colors"
              >
                Remove
              </button>
            </div>
            <FormInput
              label="Label"
              name={`label-${index}`}
              value={milestone.label}
              placeholder="e.g. Finals Week"
              onChange={(_name, value) => updateMilestone(index, 'label', String(value))}
            />
            <FormInput
              label="Date"
              name={`date-${index}`}
              type="date"
              value={milestone.date}
              onChange={(_name, value) => updateMilestone(index, 'date', String(value))}
            />
            <FormInput
              label="Emoji (optional)"
              name={`emoji-${index}`}
              value={milestone.emoji ?? ''}
              placeholder="e.g. 🎓"
              onChange={(_name, value) => updateMilestone(index, 'emoji', String(value))}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addMilestone}
          className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--ui-item-bg)',
            border: '1px solid var(--ui-item-border)',
            color: 'var(--ui-text)',
          }}
        >
          + Add Milestone
        </button>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div
          className="bg-[var(--ui-item-bg)] rounded-xl p-6 space-y-2"
        >
          {previewMilestones.length === 0 ? (
            <div className="text-sm text-[var(--ui-text-muted)] text-center">
              {state.milestones.length === 0 ? 'No milestones added' : 'All milestones have passed'}
            </div>
          ) : (
            previewMilestones.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-[var(--ui-text)]">
                  {m.emoji && <span className="mr-1">{m.emoji}</span>}
                  {m.label}
                </span>
                <span className="text-[var(--color-accent)] font-mono font-semibold">
                  {m.date}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
