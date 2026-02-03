'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface Slide {
  url: string;
  caption?: string;
}

interface SlideshowData {
  slides: Slide[];
  duration: number;
  transition: 'fade' | 'slide' | 'none';
  showCaptions: boolean;
  showProgress: boolean;
}

export default function SlideshowOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<SlideshowData>({
    slides: (data?.slides as Slide[]) ?? [],
    duration: (data?.duration as number) ?? 5,
    transition: (data?.transition as 'fade' | 'slide' | 'none') ?? 'fade',
    showCaptions: (data?.showCaptions as boolean) ?? true,
    showProgress: (data?.showProgress as boolean) ?? true,
  });

  useEffect(() => {
    if (data) {
      setState({
        slides: (data.slides as Slide[]) ?? [],
        duration: (data.duration as number) ?? 5,
        transition: (data.transition as 'fade' | 'slide' | 'none') ?? 'fade',
        showCaptions: (data.showCaptions as boolean) ?? true,
        showProgress: (data.showProgress as boolean) ?? true,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handleSlideChange = (index: number, field: 'url' | 'caption', value: string) => {
    const newSlides = [...state.slides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    const newState = { ...state, slides: newSlides };
    setState(newState);
    onChange(newState);
  };

  const addSlide = () => {
    const newSlides = [...state.slides, { url: '', caption: '' }];
    const newState = { ...state, slides: newSlides };
    setState(newState);
    onChange(newState);
  };

  const removeSlide = (index: number) => {
    const newSlides = state.slides.filter((_, i) => i !== index);
    const newState = { ...state, slides: newSlides };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Slides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--ui-text)]">Slides</h3>
          <button
            onClick={addSlide}
            className="px-3 py-1.5 bg-[var(--ui-switch-on)] text-white text-sm rounded-lg hover:brightness-110 transition-colors"
          >
            + Add Slide
          </button>
        </div>

        {state.slides.length === 0 ? (
          <div className="text-center py-8 bg-[var(--ui-panel-soft)] rounded-lg border-2 border-dashed border-[var(--ui-item-border)]">
            <span className="text-3xl">🖼️</span>
            <p className="text-[var(--ui-text-muted)] text-sm mt-2">No slides yet</p>
            <p className="text-[var(--ui-text-muted)] text-xs">Click &quot;Add Slide&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.slides.map((slide, index) => (
              <div key={index} className="bg-[var(--ui-panel-soft)] rounded-lg p-4 relative">
                <button
                  onClick={() => removeSlide(index)}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[var(--ui-text-muted)] hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                >
                  &times;
                </button>
                <div className="text-xs text-[var(--ui-text-muted)] mb-2 font-medium">Slide {index + 1}</div>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={slide.url}
                    onChange={(e) => handleSlideChange(index, 'url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 border border-[var(--ui-input-border)] rounded-lg text-sm bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 focus:ring-[var(--ui-input-focus)] focus:border-[var(--ui-input-focus)]"
                  />
                  <input
                    type="text"
                    value={slide.caption || ''}
                    onChange={(e) => handleSlideChange(index, 'caption', e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full px-3 py-2 border border-[var(--ui-input-border)] rounded-lg text-sm bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 focus:ring-[var(--ui-input-focus)] focus:border-[var(--ui-input-focus)]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-4 border-t border-[var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Slideshow Settings</h3>

        <FormInput
          label="Duration (seconds per slide)"
          name="duration"
          type="number"
          value={state.duration}
          min={1}
          max={60}
          onChange={handleChange}
        />

        <FormSelect
          label="Transition Effect"
          name="transition"
          value={state.transition}
          options={[
            { value: 'fade', label: 'Fade' },
            { value: 'slide', label: 'Slide' },
            { value: 'none', label: 'None' },
          ]}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Captions"
          name="showCaptions"
          checked={state.showCaptions}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Progress Dots"
          name="showProgress"
          checked={state.showProgress}
          onChange={handleChange}
        />
      </div>

      {/* Preview */}
      <div className="border-t border-[var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl aspect-video flex items-center justify-center overflow-hidden">
          {state.slides.length > 0 && state.slides[0].url ? (
            <div className="relative w-full h-full">
              <img
                src={state.slides[0].url}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 px-2 py-1 rounded">
                {state.slides.length} slide{state.slides.length !== 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-4xl opacity-50">🎞️</span>
              <div className="text-white/50 text-sm mt-2">No slides configured</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
