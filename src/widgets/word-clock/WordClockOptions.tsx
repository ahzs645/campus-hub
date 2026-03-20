'use client';

import { useState, useEffect } from 'react';
import { FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface WordClockData {
  accentMinutes: boolean;
}

export default function WordClockOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<WordClockData>({
    accentMinutes: (data?.accentMinutes as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        accentMinutes: (data.accentMinutes as boolean) ?? true,
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
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Options</h3>

        <FormSwitch
          label="Show Minute Dots"
          name="accentMinutes"
          checked={state.accentMinutes}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          The word clock rounds to the nearest 5 minutes. Minute dots show the remaining 1–4 minutes as small dots below the grid.
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">How It Works</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4 text-sm text-[var(--ui-text-muted)] space-y-2">
          <p>The word clock displays time using illuminated words on a letter grid.</p>
          <p className="font-mono text-xs tracking-widest text-center py-2" style={{ color: 'var(--color-accent)' }}>
            IT IS QUARTER PAST NINE
          </p>
          <p>Words light up to spell out the current time in natural language, like &ldquo;IT IS TWENTY FIVE TO THREE&rdquo;.</p>
        </div>
      </div>
    </div>
  );
}
