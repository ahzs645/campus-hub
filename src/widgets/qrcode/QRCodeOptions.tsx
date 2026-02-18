'use client';

import { useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';
import { FormInput, FormSelect } from '@/components/ui';
import AppIcon from '@/components/AppIcon';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface QRCodeData {
  text: string;
  label: string;
  fgColor: string;
  bgColor: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

export default function QRCodeOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<QRCodeData>({
    text: (data?.text as string) ?? '',
    label: (data?.label as string) ?? '',
    fgColor: (data?.fgColor as string) ?? '#000000',
    bgColor: (data?.bgColor as string) ?? '#ffffff',
    errorCorrection: (data?.errorCorrection as 'L' | 'M' | 'Q' | 'H') ?? 'M',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setState({
        text: (data.text as string) ?? '',
        label: (data.label as string) ?? '',
        fgColor: (data.fgColor as string) ?? '#000000',
        bgColor: (data.bgColor as string) ?? '#ffffff',
        errorCorrection: (data.errorCorrection as 'L' | 'M' | 'Q' | 'H') ?? 'M',
      });
    }
  }, [data]);

  useEffect(() => {
    if (!state.text) {
      setPreviewUrl(null);
      return;
    }

    QRCodeLib.toDataURL(state.text, {
      errorCorrectionLevel: state.errorCorrection,
      color: { dark: state.fgColor, light: state.bgColor },
      margin: 2,
      width: 256,
    })
      .then(setPreviewUrl)
      .catch(() => setPreviewUrl(null));
  }, [state.text, state.fgColor, state.bgColor, state.errorCorrection]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">QR Code Settings</h3>

        <FormInput
          label="Text / URL"
          name="text"
          type="text"
          value={state.text}
          placeholder="https://example.com"
          onChange={handleChange}
        />

        <FormInput
          label="Label"
          name="label"
          type="text"
          value={state.label}
          placeholder="Optional label below QR code"
          onChange={handleChange}
        />

        <FormSelect
          label="Error Correction"
          name="errorCorrection"
          value={state.errorCorrection}
          options={[
            { value: 'L', label: 'Low (7%)' },
            { value: 'M', label: 'Medium (15%)' },
            { value: 'Q', label: 'Quartile (25%)' },
            { value: 'H', label: 'High (30%)' },
          ]}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Colors</h3>

        <div className="flex gap-4">
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Foreground</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.fgColor}
                onChange={(e) => handleChange('fgColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-[var(--ui-input-border)]"
              />
              <span className="text-xs text-[var(--ui-text-muted)]">{state.fgColor}</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.bgColor}
                onChange={(e) => handleChange('bgColor', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-[var(--ui-input-border)]"
              />
              <span className="text-xs text-[var(--ui-text-muted)]">{state.bgColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl aspect-square flex flex-col items-center justify-center overflow-hidden p-4">
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="QR Code Preview"
                className="max-w-full max-h-full rounded"
              />
              {state.label && (
                <span className="mt-2 text-xs text-[var(--ui-text-muted)] truncate max-w-full">
                  {state.label}
                </span>
              )}
            </>
          ) : (
            <div className="text-center">
              <AppIcon name="qrCode" className="w-9 h-9 opacity-50 mx-auto text-white/70" />
              <div className="text-white/50 text-sm mt-2">Enter text or URL</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
