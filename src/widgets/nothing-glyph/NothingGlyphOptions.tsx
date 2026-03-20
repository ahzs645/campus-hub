'use client';

import { useState, useEffect } from 'react';
import { FormSelect, FormSwitch, FormStepper } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';
import { MODES } from './NothingGlyph';

interface NothingGlyphData {
  mode: string;
  glow: boolean;
  pixelSize: number;
  brightness: number;
}

export default function NothingGlyphOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<NothingGlyphData>({
    mode: (data?.mode as string) ?? 'pendulum',
    glow: (data?.glow as boolean) ?? true,
    pixelSize: (data?.pixelSize as number) ?? 12,
    brightness: (data?.brightness as number) ?? 4095,
  });

  useEffect(() => {
    if (data) {
      setState({
        mode: (data.mode as string) ?? 'pendulum',
        glow: (data.glow as boolean) ?? true,
        pixelSize: (data.pixelSize as number) ?? 12,
        brightness: (data.brightness as number) ?? 4095,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  // Group modes: native first, then lottie
  const nativeModes = MODES.filter(m => m.type === 'native');
  const lottieModes = MODES.filter(m => m.type === 'lottie');

  const options = [
    ...nativeModes.map(m => ({
      value: m.id,
      label: `${m.name} — ${m.description}`,
    })),
    ...lottieModes.map(m => ({
      value: m.id,
      label: `${m.name} — ${m.description}`,
    })),
  ];

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Nothing Glyph Settings</h3>

        <FormSelect
          label="Animation"
          name="mode"
          value={state.mode}
          options={options}
          onChange={handleChange}
        />

        <FormStepper
          label="Pixel Size"
          name="pixelSize"
          value={state.pixelSize}
          min={6}
          max={20}
          step={1}
          onChange={handleChange}
        />

        <FormSwitch
          label="Glow Effect"
          name="glow"
          checked={state.glow}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
