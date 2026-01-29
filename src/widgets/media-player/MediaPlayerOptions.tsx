'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface MediaPlayerData {
  url: string;
  type: 'video' | 'audio';
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
}

export default function MediaPlayerOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<MediaPlayerData>({
    url: (data?.url as string) ?? '',
    type: (data?.type as 'video' | 'audio') ?? 'video',
    autoplay: (data?.autoplay as boolean) ?? false,
    muted: (data?.muted as boolean) ?? true,
    loop: (data?.loop as boolean) ?? true,
    controls: (data?.controls as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        url: (data.url as string) ?? '',
        type: (data.type as 'video' | 'audio') ?? 'video',
        autoplay: (data.autoplay as boolean) ?? false,
        muted: (data.muted as boolean) ?? true,
        loop: (data.loop as boolean) ?? true,
        controls: (data.controls as boolean) ?? true,
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
      {/* Media Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Media Settings</h3>

        <FormSelect
          label="Media Type"
          name="type"
          value={state.type}
          options={[
            { value: 'video', label: 'Video' },
            { value: 'audio', label: 'Audio' },
          ]}
          onChange={handleChange}
        />

        <FormInput
          label="Media URL"
          name="url"
          type="url"
          value={state.url}
          placeholder="https://example.com/video.mp4"
          onChange={handleChange}
        />

        <div className="text-sm text-gray-500">
          Supports MP4, WebM, MP3, and other browser-compatible formats.
        </div>
      </div>

      {/* Playback Options */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-gray-900">Playback Options</h3>

        <FormSwitch
          label="Autoplay"
          name="autoplay"
          checked={state.autoplay}
          onChange={handleChange}
        />

        <FormSwitch
          label="Muted (required for autoplay)"
          name="muted"
          checked={state.muted}
          onChange={handleChange}
        />

        <FormSwitch
          label="Loop"
          name="loop"
          checked={state.loop}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Controls"
          name="controls"
          checked={state.controls}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
        <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center">
          {state.url ? (
            <div className="text-center">
              <span className="text-4xl">{state.type === 'audio' ? '🎵' : '🎬'}</span>
              <div className="text-white/70 text-sm mt-2">{state.type === 'audio' ? 'Audio' : 'Video'} configured</div>
              <div className="text-white/50 text-xs mt-1 truncate max-w-xs">{state.url}</div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-4xl opacity-50">{state.type === 'audio' ? '🎵' : '🎬'}</span>
              <div className="text-white/50 text-sm mt-2">No media URL</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
