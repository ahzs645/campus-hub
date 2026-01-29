'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface PosterCarouselData {
  rotationSeconds: number;
  apiUrl: string;
}

export default function PosterCarouselOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<PosterCarouselData>({
    rotationSeconds: (data?.rotationSeconds as number) ?? 10,
    apiUrl: (data?.apiUrl as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        rotationSeconds: (data.rotationSeconds as number) ?? 10,
        apiUrl: (data.apiUrl as string) ?? '',
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
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Carousel Settings</h3>

        <FormInput
          label="Rotation Speed (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={3}
          max={60}
          onChange={handleChange}
        />

        <div className="text-sm text-gray-500">
          Each poster will display for {state.rotationSeconds} seconds before transitioning to the next.
        </div>
      </div>

      {/* API Configuration */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-gray-900">Data Source</h3>

        <FormInput
          label="API URL (optional)"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder="https://api.example.com/posters"
          onChange={handleChange}
        />

        <div className="text-sm text-gray-500">
          Leave empty to use default sample posters. The API should return an array of objects with:
          <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
            {`[{ "title": "...", "subtitle": "...", "image": "url" }]`}
          </code>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
        <div className="bg-gray-900 rounded-xl p-4 aspect-video relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop"
            alt="Sample poster"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="text-2xl font-bold text-white">Sample Event</div>
            <div className="text-sm text-white/80">March 15-17 | Main Quad</div>
          </div>
          <div className="absolute top-2 left-2 right-2 h-1 bg-black/30 rounded">
            <div className="h-full w-1/3 bg-amber-500 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
