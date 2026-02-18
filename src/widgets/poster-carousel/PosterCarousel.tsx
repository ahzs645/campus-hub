'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import PosterCarouselOptions from './PosterCarouselOptions';

interface Poster {
  id: string | number;
  title: string;
  subtitle?: string;
  image: string;
}

interface PosterCarouselConfig {
  rotationSeconds?: number;
  apiUrl?: string;
  posters?: Poster[];
}

const DEFAULT_POSTERS: Poster[] = [
  {
    id: 1,
    title: 'Spring Festival 2025',
    subtitle: 'March 15-17 | Main Quad',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop',
  },
  {
    id: 2,
    title: 'Career Fair',
    subtitle: 'Meet 50+ employers | March 20',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
  },
  {
    id: 3,
    title: 'Basketball Championship',
    subtitle: 'Finals this Saturday | 7PM',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
  },
  {
    id: 4,
    title: 'Art Exhibition Opening',
    subtitle: 'Student Gallery | Free Entry',
    image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=600&fit=crop',
  },
];

export default function PosterCarousel({ config, theme }: WidgetComponentProps) {
  const carouselConfig = config as PosterCarouselConfig | undefined;
  const rotationSeconds = carouselConfig?.rotationSeconds ?? 10;
  const apiUrl = carouselConfig?.apiUrl;

  const [posters, setPosters] = useState<Poster[]>(carouselConfig?.posters ?? DEFAULT_POSTERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (apiUrl) return;
    setPosters(carouselConfig?.posters ?? DEFAULT_POSTERS);
    setCurrentIndex(0);
    setProgress(0);
    setIsTransitioning(false);
  }, [apiUrl, carouselConfig?.posters]);

  // Fetch posters from API if provided
  useEffect(() => {
    if (!apiUrl) return;

    const fetchPosters = async () => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setPosters(data);
        }
      } catch (error) {
        console.error('Failed to fetch posters:', error);
      }
    };

    fetchPosters();
    const interval = setInterval(fetchPosters, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [apiUrl]);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % posters.length);
      setProgress(0);
      setIsTransitioning(false);
    }, 500);
  }, [posters.length]);

  useEffect(() => {
    if (posters.length <= 1) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 100 / (rotationSeconds * 10);
      });
    }, 100);

    const rotationInterval = setInterval(nextSlide, rotationSeconds * 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(rotationInterval);
    };
  }, [posters.length, rotationSeconds, nextSlide]);

  const current = posters[currentIndex];

  if (!current) {
    return (
      <div
        className="h-full rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-white/50">No posters available</span>
      </div>
    );
  }

  return (
    <div className="relative h-full rounded-2xl overflow-hidden shadow-2xl group">
      {/* Background image with Ken Burns effect */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        <img
          src={current.image}
          alt={current.title}
          className="w-full h-full object-cover animate-ken-burns"
          style={{
            animationDuration: `${rotationSeconds}s`,
          }}
        />
      </div>

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8 xl:p-12">
        <h2
          className="text-4xl xl:text-6xl font-display font-bold text-white mb-3 leading-tight"
          style={{
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
          }}
        >
          {current.title}
        </h2>
        {current.subtitle && (
          <p className="text-xl xl:text-2xl text-white/90 font-medium">
            {current.subtitle}
          </p>
        )}
      </div>

      {/* Progress dots */}
      {posters.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-2">
          {posters.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                setProgress(0);
              }}
              className="w-3 h-3 rounded-full transition-all duration-300 hover:scale-125"
              style={{
                backgroundColor: idx === currentIndex ? theme.accent : 'rgba(255,255,255,0.4)',
                transform: idx === currentIndex ? 'scale(1.2)' : 'scale(1)',
                boxShadow: idx === currentIndex ? `0 0 20px ${theme.accent}` : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-black/30">
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: theme.accent,
            boxShadow: `0 0 10px ${theme.accent}`,
          }}
        />
      </div>

      {/* Decorative corner accent */}
      <div
        className="absolute top-0 left-0 w-24 h-24 opacity-50"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}40 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'poster-carousel',
  name: 'Poster Carousel',
  description: 'Rotating display of event posters and announcements',
  icon: 'carousel',
  minW: 4,
  minH: 3,
  defaultW: 8,
  defaultH: 5,
  component: PosterCarousel,
  OptionsComponent: PosterCarouselOptions,
  defaultProps: {
    rotationSeconds: 10,
  },
});
