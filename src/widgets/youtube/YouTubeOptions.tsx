'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface YouTubeData {
  videoId: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
}

export default function YouTubeOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<YouTubeData>({
    videoId: (data?.videoId as string) ?? '',
    autoplay: (data?.autoplay as boolean) ?? false,
    muted: (data?.muted as boolean) ?? true,
    loop: (data?.loop as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        videoId: (data.videoId as string) ?? '',
        autoplay: (data.autoplay as boolean) ?? false,
        muted: (data.muted as boolean) ?? true,
        loop: (data.loop as boolean) ?? true,
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
      {/* Video URL */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Video Settings</h3>

        <FormInput
          label="YouTube URL or Video ID"
          name="videoId"
          type="text"
          value={state.videoId}
          placeholder="https://youtube.com/watch?v=... or video ID"
          onChange={handleChange}
        />

        <div className="text-sm text-gray-500">
          Paste a YouTube URL or just the video ID (e.g., dQw4w9WgXcQ)
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
          label="Loop Video"
          name="loop"
          checked={state.loop}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
        <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center">
          {state.videoId ? (
            <div className="text-center">
              <span className="text-4xl">📺</span>
              <div className="text-white/70 text-sm mt-2">Video configured</div>
              <div className="text-white/50 text-xs mt-1 font-mono">{state.videoId}</div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-4xl opacity-50">📺</span>
              <div className="text-white/50 text-sm mt-2">No video URL</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
