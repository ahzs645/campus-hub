'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type HolidayStyle = 'modern' | 'bauhaus';

interface HolidayCalendarData {
  style: HolidayStyle;
}

function normalizeStyle(value: unknown): HolidayStyle {
  if (value === 'modern' || value === 'bauhaus') return value;
  return 'modern';
}

export default function HolidayCalendarOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<HolidayCalendarData>({
    style: normalizeStyle(data?.style),
  });

  useEffect(() => {
    if (data) {
      setState({
        style: normalizeStyle(data.style),
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Options</h3>

        <FormSelect
          label="Style"
          name="style"
          value={state.style}
          options={[
            { value: 'modern', label: 'Modern' },
            { value: 'bauhaus', label: 'Bauhaus' },
          ]}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
