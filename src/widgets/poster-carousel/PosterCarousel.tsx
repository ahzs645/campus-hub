'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { fetchTextWithCache, buildCacheKey } from '@/lib/data-cache';
import PosterCarouselOptions from './PosterCarouselOptions';

interface Poster {
  id: string | number;
  title: string;
  subtitle?: string;
  image: string;
}

type DataSource = 'default' | 'api' | 'unbc-news';

interface PosterCarouselConfig {
  rotationSeconds?: number;
  apiUrl?: string;
  posters?: Poster[];
  dataSource?: DataSource;
  maxStories?: number;
  corsProxy?: string;
  refreshInterval?: number;
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

const UNBC_NEWS_URL = 'https://www.unbc.ca/our-stories/releases';

/** Build the proxied UNBC news fetch URL based on the selected CORS proxy */
const buildProxiedUrl = (corsProxy: string, targetUrl: string): string => {
  if (corsProxy.includes('cors.lol')) {
    return `https://api.cors.lol/?url=${targetUrl.replace('https://', '')}#!`;
  }
  if (corsProxy.includes('corsproxy.io')) {
    return `https://corsproxy.io/?${targetUrl}`;
  }
  if (corsProxy.includes('allorigins.win')) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  }
  return `${corsProxy}${targetUrl}`;
};

/** Parse the UNBC news releases page HTML into poster items */
const parseUNBCNewsPage = (html: string, maxStories: number): Poster[] => {
  const posters: Poster[] = [];

  // Match story blocks: an <a> with image followed by <h3> with title link
  // Pattern: <a href="/our-stories/story/..."><img src="..." /></a> ... <h3><a href="...">Title</a></h3>
  const storyPattern = /<a\s+href="(\/our-stories\/story\/[^"]+)"[^>]*>\s*<img\s+[^>]*src="([^"]+)"[^>]*\/?\s*>\s*<\/a>[\s\S]*?<h3>\s*<a\s+href="\/our-stories\/story\/[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/h3>/gi;

  let match: RegExpExecArray | null;
  while ((match = storyPattern.exec(html)) !== null && posters.length < maxStories) {
    const storyPath = match[1];
    const imageSrc = match[2];
    const title = match[3].replace(/<[^>]*>/g, '').trim();

    if (!title || !imageSrc) continue;

    // Make image URL absolute
    const imageUrl = imageSrc.startsWith('http')
      ? imageSrc
      : `https://www.unbc.ca${imageSrc}`;

    // Try to extract date text after the </h3> tag
    const afterH3 = html.substring(match.index + match[0].length, match.index + match[0].length + 200);
    const dateMatch = afterH3.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    const subtitle = dateMatch ? dateMatch[1] : undefined;

    posters.push({
      id: storyPath,
      title,
      subtitle,
      image: imageUrl,
    });
  }

  return posters;
};

export default function PosterCarousel({ config, theme }: WidgetComponentProps) {
  const carouselConfig = config as PosterCarouselConfig | undefined;
  const rotationSeconds = carouselConfig?.rotationSeconds ?? 10;
  const dataSource = carouselConfig?.dataSource ?? 'default';
  const apiUrl = carouselConfig?.apiUrl;
  const maxStories = carouselConfig?.maxStories ?? 5;
  const corsProxy = carouselConfig?.corsProxy?.trim() ?? 'https://corsproxy.io/?';
  const refreshInterval = carouselConfig?.refreshInterval ?? 30; // minutes

  const [posters, setPosters] = useState<Poster[]>(carouselConfig?.posters ?? DEFAULT_POSTERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to defaults when using default source
  useEffect(() => {
    if (dataSource !== 'default') return;
    setPosters(carouselConfig?.posters ?? DEFAULT_POSTERS);
    setCurrentIndex(0);
    setProgress(0);
    setIsTransitioning(false);
    setError(null);
  }, [dataSource, carouselConfig?.posters]);

  // Fetch posters from JSON API
  useEffect(() => {
    if (dataSource !== 'api' || !apiUrl) return;

    const fetchPosters = async () => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setPosters(data);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch posters:', err);
        setError('Failed to load posters from API');
      }
    };

    fetchPosters();
    const interval = setInterval(fetchPosters, 60000);
    return () => clearInterval(interval);
  }, [dataSource, apiUrl]);

  // Fetch UNBC news stories
  useEffect(() => {
    if (dataSource !== 'unbc-news') return;

    const fetchNews = async () => {
      try {
        const proxiedUrl = buildProxiedUrl(corsProxy, UNBC_NEWS_URL);
        const { text } = await fetchTextWithCache(proxiedUrl, {
          cacheKey: buildCacheKey('unbc-news', UNBC_NEWS_URL),
          ttlMs: refreshInterval * 60 * 1000,
          allowStale: true,
        });
        const stories = parseUNBCNewsPage(text, maxStories);
        if (stories.length > 0) {
          setPosters(stories);
          setCurrentIndex(0);
          setProgress(0);
          setError(null);
        } else {
          setError('No stories found on UNBC page');
        }
      } catch (err) {
        console.error('Failed to fetch UNBC news:', err);
        setError('Failed to load UNBC news');
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [dataSource, corsProxy, maxStories, refreshInterval]);

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
        className="h-full rounded-2xl flex items-center justify-center flex-col gap-2"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-white/50">{error ?? 'No posters available'}</span>
        {dataSource === 'unbc-news' && error && (
          <span className="text-white/30 text-sm">Check CORS proxy settings</span>
        )}
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

      {/* UNBC News badge */}
      {dataSource === 'unbc-news' && (
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white/90 backdrop-blur-sm"
          style={{ backgroundColor: `${theme.primary}99` }}
        >
          UNBC News
        </div>
      )}
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
