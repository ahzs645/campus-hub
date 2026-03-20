'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface FlashcardData {
  language: string;
  mode: string;
  flipInterval: number;
}

export default function FlashcardOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<FlashcardData>(() => ({
    language: (data?.language as string) ?? 'spanish',
    mode: (data?.mode as string) ?? 'cycle',
    flipInterval: (data?.flipInterval as number) ?? 5,
  }));

  useEffect(() => {
    if (data) {
      setState({
        language: (data.language as string) ?? 'spanish',
        mode: (data.mode as string) ?? 'cycle',
        flipInterval: (data.flipInterval as number) ?? 5,
      });
    }
  }, [data]);

  const emit = (newState: FlashcardData) => {
    setState(newState);
    onChange(newState as unknown as Record<string, unknown>);
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    emit({ ...state, [name]: value });
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <FormSelect
        label="Language"
        name="language"
        value={state.language}
        options={[
          { value: 'spanish', label: 'Spanish' },
          { value: 'french', label: 'French' },
          { value: 'german', label: 'German' },
          { value: 'japanese', label: 'Japanese' },
        ]}
        onChange={handleChange}
      />

      <FormSelect
        label="Mode"
        name="mode"
        value={state.mode}
        options={[
          { value: 'cycle', label: 'Cycle through cards' },
          { value: 'daily', label: 'Word of the day' },
        ]}
        onChange={handleChange}
      />

      <FormSelect
        label="Flip Interval"
        name="flipInterval"
        value={String(state.flipInterval)}
        options={[
          { value: '3', label: '3 seconds' },
          { value: '5', label: '5 seconds' },
          { value: '8', label: '8 seconds' },
          { value: '10', label: '10 seconds' },
        ]}
        onChange={(name, value) => handleChange(name, Number(value))}
      />
    </div>
  );
}
