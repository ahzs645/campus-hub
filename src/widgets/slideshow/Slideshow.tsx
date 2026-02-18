'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import AppIcon from '@/components/AppIcon';
import SlideshowOptions from './SlideshowOptions';

interface Slide {
  url: string;
  caption?: string;
}

interface SlideshowConfig {
  slides?: Slide[];
  duration?: number;
  transition?: 'fade' | 'slide' | 'none';
  showCaptions?: boolean;
  showProgress?: boolean;
}

export default function Slideshow({ config, theme }: WidgetComponentProps) {
  const slideshowConfig = config as SlideshowConfig | undefined;
  const slides = slideshowConfig?.slides ?? [];
  const duration = (slideshowConfig?.duration ?? 5) * 1000;
  const transition = slideshowConfig?.transition ?? 'fade';
  const showCaptions = slideshowConfig?.showCaptions ?? true;
  const showProgress = slideshowConfig?.showProgress ?? true;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToNext = useCallback(() => {
    if (slides.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
      setIsTransitioning(false);
    }, 300);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(goToNext, duration);
    return () => clearInterval(interval);
  }, [slides.length, duration, goToNext]);

  if (slides.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <AppIcon name="image" className="w-9 h-9 mb-3 text-white/70" />
        <span className="text-white/70 text-sm">No slides configured</span>
        <span className="text-white/50 text-xs mt-1">Add image URLs in settings</span>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  const getTransitionClasses = () => {
    if (transition === 'none') return '';
    if (transition === 'slide') {
      return isTransitioning ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100';
    }
    // Default fade
    return isTransitioning ? 'opacity-0' : 'opacity-100';
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-black relative">
      <div
        className={`w-full h-full transition-all duration-300 ${getTransitionClasses()}`}
      >
        <img
          src={currentSlide.url}
          alt={currentSlide.caption || `Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
        {showCaptions && currentSlide.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white text-sm font-medium">{currentSlide.caption}</p>
          </div>
        )}
      </div>

      {showProgress && slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'slideshow',
  name: 'Slideshow',
  description: 'Rotating image slideshow with captions',
  icon: 'slideshow',
  minW: 3,
  minH: 2,
  defaultW: 6,
  defaultH: 4,
  component: Slideshow,
  OptionsComponent: SlideshowOptions,
  defaultProps: {
    slides: [],
    duration: 5,
    transition: 'fade',
    showCaptions: true,
    showProgress: true,
  },
});
