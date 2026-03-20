'use client';

import { useState, useEffect } from 'react';
import { FormSelect, FormSwitch, FormStepper, FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';
import GLYPH_CATALOG from './glyphCatalog';

interface NothingGlyphData {
  glyphId: string;
  customUrl: string;
  glow: boolean;
  pixelPitch: number;
  gridSize: number;
  speed: number;
  dotColor: string;
  bgColor: string;
  showBrowser: boolean;
}

export default function NothingGlyphOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<NothingGlyphData>({
    glyphId: (data?.glyphId as string) ?? 'dice',
    customUrl: (data?.customUrl as string) ?? '',
    glow: (data?.glow as boolean) ?? true,
    pixelPitch: (data?.pixelPitch as number) ?? 5,
    gridSize: (data?.gridSize as number) ?? 33,
    speed: (data?.speed as number) ?? 1,
    dotColor: (data?.dotColor as string) ?? 'auto',
    bgColor: (data?.bgColor as string) ?? '#000000',
    showBrowser: (data?.showBrowser as boolean) ?? false,
  });

  useEffect(() => {
    if (data) {
      setState({
        glyphId: (data.glyphId as string) ?? 'dice',
        customUrl: (data.customUrl as string) ?? '',
        glow: (data.glow as boolean) ?? true,
        pixelPitch: (data.pixelPitch as number) ?? 5,
        gridSize: (data.gridSize as number) ?? 33,
        speed: (data.speed as number) ?? 1,
        dotColor: (data.dotColor as string) ?? 'auto',
        bgColor: (data.bgColor as string) ?? '#000000',
        showBrowser: (data.showBrowser as boolean) ?? false,
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
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Nothing Glyph Settings</h3>

        <FormSelect
          label="Glyph Toy"
          name="glyphId"
          value={state.glyphId}
          options={GLYPH_CATALOG.map(g => ({
            value: g.id,
            label: `${g.name} — ${g.creator}`,
          }))}
          onChange={handleChange}
        />

        <FormInput
          label="Custom Lottie URL (overrides selection)"
          name="customUrl"
          value={state.customUrl}
          onChange={handleChange}
        />

        <FormStepper
          label="Grid Size"
          name="gridSize"
          value={state.gridSize}
          min={11}
          max={65}
          step={2}
          onChange={handleChange}
        />

        <FormStepper
          label="Pixel Size"
          name="pixelPitch"
          value={state.pixelPitch}
          min={2}
          max={10}
          step={1}
          onChange={handleChange}
        />

        <FormSelect
          label="Speed"
          name="speed"
          value={String(state.speed)}
          options={[
            { value: '0.25', label: '0.25x' },
            { value: '0.5', label: '0.5x' },
            { value: '1', label: '1x' },
            { value: '1.5', label: '1.5x' },
            { value: '2', label: '2x' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <FormSelect
          label="Dot Color"
          name="dotColor"
          value={state.dotColor}
          options={[
            { value: 'auto', label: 'Original colors' },
            { value: '#FFFFFF', label: 'White' },
            { value: '#20FF00', label: 'Nothing Green' },
            { value: '#FF3333', label: 'Red' },
            { value: '#3399FF', label: 'Blue' },
          ]}
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
