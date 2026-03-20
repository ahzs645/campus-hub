'use client';

import { useState, useEffect } from 'react';
import { FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface F1CountdownData {
  showSessions: boolean;
}

export default function F1CountdownOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<F1CountdownData>({
    showSessions: (data?.showSessions as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        showSessions: (data.showSessions as boolean) ?? true,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState as unknown as Record<string, unknown>);
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Settings</h3>

        <FormSwitch
          label="Show Sessions"
          name="showSessions"
          checked={state.showSessions}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Display upcoming session times (Practice, Qualifying, Race) below the countdown.
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">Preview</h4>
        <div className="bg-[#111] rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-1">
            Next Race
          </div>
          <div className="text-sm font-semibold text-white mb-1">
            {'\u{1F1E6}\u{1F1FA}'} Australian Grand Prix
          </div>
          <div className="text-[10px] text-white/50 mb-2">Albert Park Circuit</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--color-accent)' }}>12</span>
            <span className="text-[10px] text-white/50 mr-1">days</span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--color-accent)' }}>08</span>
            <span className="text-[10px] text-white/40">h</span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--color-accent)' }}>15</span>
            <span className="text-[10px] text-white/40">m</span>
            <span className="text-base font-bold font-mono" style={{ color: 'var(--color-accent)' }}>33</span>
            <span className="text-[10px] text-white/40">s</span>
          </div>
          {state.showSessions && (
            <div className="flex gap-3 mt-2">
              <div className="text-[9px] text-white/40">
                <span className="font-medium text-white/60">FP1</span> Fri, Mar 14
              </div>
              <div className="text-[9px] text-white/40">
                <span className="font-medium text-white/60">Qualifying</span> Sat, Mar 15
              </div>
              <div className="text-[9px] text-white/40">
                <span className="font-medium text-white/60">Race</span> Sun, Mar 16
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
