'use client';

import { useState, useEffect, useRef } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ImageData {
  url: string;
  alt: string;
  fit: 'cover' | 'contain' | 'fill';
}

function isSvgDataUrl(url: string) {
  return url.startsWith('data:image/svg+xml');
}

export default function ImageOptions({ data, onChange }: WidgetOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImageData>({
    url: (data?.url as string) ?? '',
    alt: (data?.alt as string) ?? 'Image',
    fit: (data?.fit as 'cover' | 'contain' | 'fill') ?? 'cover',
  });

  useEffect(() => {
    if (data) {
      setState({
        url: (data.url as string) ?? '',
        alt: (data.alt as string) ?? 'Image',
        fit: (data.fit as 'cover' | 'contain' | 'fill') ?? 'cover',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const svgText = reader.result as string;
      const dataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
      const newState = { ...state, url: dataUrl };
      setState(newState);
      onChange(newState);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-uploaded
    e.target.value = '';
  };

  const handleClearSvg = () => {
    const newState = { ...state, url: '' };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Image Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Image Settings</h3>

        {/* SVG Upload */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Upload SVG</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--ui-input-bg)',
                color: 'var(--ui-text)',
                border: '1px solid var(--ui-input-border)',
              }}
            >
              Choose SVG File
            </button>
            {isSvgDataUrl(state.url) && (
              <button
                type="button"
                onClick={handleClearSvg}
                className="px-3 py-2 rounded-lg text-sm transition-colors text-red-400 hover:text-red-300"
                style={{
                  backgroundColor: 'var(--ui-input-bg)',
                  border: '1px solid var(--ui-input-border)',
                }}
              >
                Clear
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            onChange={handleSvgUpload}
            className="hidden"
          />
          {isSvgDataUrl(state.url) && (
            <p className="text-xs text-[var(--ui-text-muted)]">SVG embedded in configuration</p>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 border-t border-[var(--ui-input-border)]" />
          <p className="relative text-center text-xs text-[var(--ui-text-muted)] bg-[var(--ui-bg)] w-fit mx-auto px-2">or use a URL</p>
        </div>

        <FormInput
          label="Image URL"
          name="url"
          type="url"
          value={isSvgDataUrl(state.url) ? '' : state.url}
          placeholder="https://example.com/image.jpg"
          onChange={handleChange}
          disabled={isSvgDataUrl(state.url)}
        />

        <FormInput
          label="Alt Text"
          name="alt"
          type="text"
          value={state.alt}
          placeholder="Description of the image"
          onChange={handleChange}
        />

        <FormSelect
          label="Image Fit"
          name="fit"
          value={state.fit}
          options={[
            { value: 'cover', label: 'Cover (fill, may crop)' },
            { value: 'contain', label: 'Contain (fit, may letterbox)' },
            { value: 'fill', label: 'Fill (stretch to fit)' },
          ]}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl aspect-video flex items-center justify-center overflow-hidden">
          {state.url ? (
            <img
              src={state.url}
              alt={state.alt}
              className="max-w-full max-h-full"
              style={{ objectFit: state.fit }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="text-center">
              <span className="text-4xl opacity-50">🖼️</span>
              <div className="text-white/50 text-sm mt-2">No image URL</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
