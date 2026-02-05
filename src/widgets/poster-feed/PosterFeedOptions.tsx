'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface PosterFeedData {
  feedUrl: string;
  rotationSeconds: number;
  animationMode: string;
}

const ANIMATION_MODES = [
  { value: 'stack', label: 'Stack' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'fade', label: 'Fade' },
];

export default function PosterFeedOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<PosterFeedData>({
    feedUrl: (data?.feedUrl as string) ?? '',
    rotationSeconds: (data?.rotationSeconds as number) ?? 8,
    animationMode: (data?.animationMode as string) ?? 'stack',
  });

  useEffect(() => {
    if (data) {
      setState({
        feedUrl: (data.feedUrl as string) ?? '',
        rotationSeconds: (data.rotationSeconds as number) ?? 8,
        animationMode: (data.animationMode as string) ?? 'stack',
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
      {/* RSS Feed */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">RSS Feed Source</h3>

        <FormInput
          label="Feed URL"
          name="feedUrl"
          type="url"
          value={state.feedUrl}
          placeholder="https://example.com/feed.xml"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Enter an RSS feed URL. Images will be extracted from feed items automatically.
          Leave empty to show sample posters.
        </div>
      </div>

      {/* Animation */}
      <div className="space-y-4 border-t border-[var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Settings</h3>

        <FormSelect
          label="Animation Mode"
          name="animationMode"
          value={state.animationMode}
          options={ANIMATION_MODES}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          {state.animationMode === 'stack' && 'Stacked cards with rotation. One active poster at a time with sliding text.'}
          {state.animationMode === 'carousel' && '3D perspective carousel. Cards fan out with depth and smooth transitions.'}
          {state.animationMode === 'fade' && 'Full-bleed crossfade with Ken Burns zoom effect and progress bar.'}
        </div>

        <FormInput
          label="Rotation Speed (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={3}
          max={120}
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Each poster displays for {state.rotationSeconds} seconds before advancing.
        </div>
      </div>

      {/* Mode Preview */}
      <div className="border-t border-[var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Mode Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4 aspect-video relative overflow-hidden">
          {state.animationMode === 'stack' && (
            <div className="relative h-full flex items-center justify-center">
              {[4, -2, 7].map((rot, i) => (
                <div
                  key={i}
                  className="absolute rounded-lg overflow-hidden border-2 border-white/20"
                  style={{
                    height: '80%',
                    aspectRatio: '8.5/11',
                    transform: `rotate(${rot}deg)`,
                    zIndex: i === 0 ? 3 : 3 - i,
                    opacity: i === 0 ? 1 : 0.5,
                    backgroundColor: 'var(--ui-panel-bg)',
                    border: i === 0 ? '2px solid var(--color-accent)' : '2px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-primary)]/30" />
                </div>
              ))}
              <div className="absolute bottom-1 right-2 text-[10px] text-white/40">1/4</div>
            </div>
          )}
          {state.animationMode === 'carousel' && (
            <div className="flex items-center justify-center h-full gap-2" style={{ perspective: '500px' }}>
              {[-1, 0, 1].map((offset) => (
                <div
                  key={offset}
                  className="rounded-lg overflow-hidden"
                  style={{
                    height: offset === 0 ? '85%' : '60%',
                    aspectRatio: '8.5/11',
                    transform: `translateZ(${offset === 0 ? '20px' : '-30px'}) rotateY(${offset * -10}deg)`,
                    opacity: offset === 0 ? 1 : 0.35,
                    backgroundColor: 'var(--ui-panel-bg)',
                    border: offset === 0 ? '2px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-primary)]/30" />
                </div>
              ))}
            </div>
          )}
          {state.animationMode === 'fade' && (
            <div className="h-full relative flex items-center justify-center">
              <div
                className="h-3/4 rounded-lg bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-primary)]/30"
                style={{ aspectRatio: '8.5/11' }}
              />
              <div className="absolute top-0 left-0 right-0 h-1 bg-black/30 rounded-t-lg">
                <div className="h-full w-1/3 bg-[var(--color-accent)] rounded-tl-lg" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
