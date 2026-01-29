'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ImageData {
  url: string;
  alt: string;
  fit: 'cover' | 'contain' | 'fill';
}

export default function ImageOptions({ data, onChange }: WidgetOptionsProps) {
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

  return (
    <div className="space-y-6">
      {/* Image Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Image Settings</h3>

        <FormInput
          label="Image URL"
          name="url"
          type="url"
          value={state.url}
          placeholder="https://example.com/image.jpg"
          onChange={handleChange}
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
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
        <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center overflow-hidden">
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
