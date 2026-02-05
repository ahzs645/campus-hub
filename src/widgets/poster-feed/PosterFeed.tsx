'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { parseRss } from '@/lib/feeds';
import { fetchTextWithCache, buildCacheKey } from '@/lib/data-cache';
import PosterFeedOptions from './PosterFeedOptions';

export interface FeedPoster {
  id: string;
  title: string;
  image?: string;
}

interface PosterFeedConfig {
  feedUrl?: string;
  rotationSeconds?: number;
  animationMode?: 'stack' | 'carousel' | 'fade';
}

const DEFAULT_POSTERS: FeedPoster[] = [
  {
    id: '1',
    title: 'Spring Festival',
    image: 'https://images.unsplash.com/photo-1723274565296-2945e2ebc306?w=400&h=520&fit=crop',
  },
  {
    id: '2',
    title: 'Career Fair',
    image: 'https://images.unsplash.com/photo-1607930232028-f01079639b00?w=400&h=520&fit=crop',
  },
  {
    id: '3',
    title: 'Basketball Finals',
    image: 'https://images.unsplash.com/photo-1677757103853-a304b6a182f5?w=400&h=520&fit=crop',
  },
  {
    id: '4',
    title: 'Art Exhibition',
    image: 'https://images.unsplash.com/photo-1676312830459-f6f13dfdd899?w=400&h=520&fit=crop',
  },
];

/** Extract the first image URL from an RSS item's description HTML or enclosure */
function extractImage(item: { description?: string }): string | undefined {
  if (!item.description) return undefined;
  const imgMatch = item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  const urlMatch = item.description.match(/(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|svg))/i);
  return urlMatch ? urlMatch[1] : undefined;
}

// ─── Stack Mode ───────────────────────────────────────────────────────────────
// Stacked poster images with rotation. Active card does the moveOutIn shuffle
// animation (slides left, scales up, comes back on top). Other cards briefly
// straighten while the active one transitions.

const STACK_ROTATIONS = [4, -2, -9, 7, 3, -5, 6, -3];

function StackMode({
  posters,
  activeIndex,
  theme,
}: {
  posters: FeedPoster[];
  activeIndex: number;
  theme: WidgetComponentProps['theme'];
}) {
  const [animating, setAnimating] = useState(false);
  const prevIndexRef = useRef(activeIndex);
  // Track which cards have been "activated" so they stack on top in order
  const [zStack, setZStack] = useState<number[]>([0]);

  useEffect(() => {
    if (activeIndex !== prevIndexRef.current) {
      prevIndexRef.current = activeIndex;
      setAnimating(true);
      setZStack((prev) => [...prev.filter((i) => i !== activeIndex), activeIndex]);
    }
  }, [activeIndex]);

  const handleAnimationEnd = useCallback(() => {
    setAnimating(false);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      {posters.map((poster, i) => {
        const rotation = STACK_ROTATIONS[i % STACK_ROTATIONS.length];
        const isActive = i === activeIndex;
        const stackOrder = zStack.indexOf(i);
        const z = stackOrder === -1 ? 0 : stackOrder + 1;

        return (
          <div
            key={poster.id}
            className="absolute rounded-lg overflow-hidden"
            onAnimationEnd={isActive ? handleAnimationEnd : undefined}
            style={{
              height: '85%',
              maxWidth: '70%',
              rotate: `${rotation}deg`,
              zIndex: z,
              border: `3px solid ${isActive ? theme.accent : 'rgba(255,255,255,0.12)'}`,
              boxShadow: isActive
                ? `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${theme.accent}30`
                : '0 4px 15px rgba(0,0,0,0.3)',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              // Active card: play the moveOutIn shuffle animation
              ...(isActive && animating
                ? {
                    animation: '0.66s poster-move-out-in cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  }
                : {}),
              // Non-active cards: briefly straighten while active card animates
              ...(!isActive && animating
                ? {
                    animation: '0.75s poster-straighten ease',
                  }
                : {}),
            }}
          >
            {poster.image ? (
              <img
                src={poster.image}
                alt={poster.title}
                className="h-full w-auto object-contain"
              />
            ) : (
              <div
                className="h-full aspect-[8.5/11] flex items-center justify-center text-2xl font-bold text-white/30"
                style={{ backgroundColor: `${theme.primary}60` }}
              >
                {poster.title.charAt(0)}
              </div>
            )}
          </div>
        );
      })}

      {/* Counter */}
      <div
        className="absolute bottom-2 right-3 text-xs px-2 py-0.5 rounded-full backdrop-blur z-20"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: theme.accent }}
      >
        {activeIndex + 1}/{posters.length}
      </div>
    </div>
  );
}

// ─── Carousel Mode ────────────────────────────────────────────────────────────
// 3D perspective carousel, poster images fan out from center

function CarouselMode({
  posters,
  activeIndex,
  theme,
}: {
  posters: FeedPoster[];
  activeIndex: number;
  theme: WidgetComponentProps['theme'];
}) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      style={{ perspective: '1000px' }}
    >
      {posters.map((poster, i) => {
        const offset = i - activeIndex;
        const absOffset = Math.abs(offset);
        const isActive = offset === 0;
        const isVisible = absOffset <= 2;

        return (
          <div
            key={poster.id}
            className="absolute transition-all duration-700 ease-out rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              height: '88%',
              maxWidth: '55%',
              transform: `
                translateX(${offset * 60}%)
                translateZ(${isActive ? '40px' : `-${absOffset * 60}px`})
                rotateY(${offset * -8}deg)
                scale(${isActive ? 1 : Math.max(0.7, 1 - absOffset * 0.15)})
              `,
              zIndex: isActive ? 10 : 5 - absOffset,
              opacity: isVisible ? (isActive ? 1 : 0.4 - absOffset * 0.1) : 0,
              boxShadow: isActive
                ? `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${theme.accent}20`
                : '0 10px 30px rgba(0,0,0,0.3)',
            }}
          >
            {poster.image ? (
              <img
                src={poster.image}
                alt={poster.title}
                className="h-full w-auto object-contain"
              />
            ) : (
              <div
                className="h-full aspect-[8.5/11] flex items-center justify-center text-4xl font-bold text-white/20"
                style={{ backgroundColor: `${theme.primary}60` }}
              >
                {poster.title.charAt(0)}
              </div>
            )}
          </div>
        );
      })}

      {/* Progress dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {posters.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i === activeIndex ? theme.accent : 'rgba(255,255,255,0.3)',
              transform: i === activeIndex ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Fade Mode ────────────────────────────────────────────────────────────────
// Crossfade between poster images

function FadeMode({
  posters,
  activeIndex,
  theme,
  progress,
}: {
  posters: FeedPoster[];
  activeIndex: number;
  theme: WidgetComponentProps['theme'];
  progress: number;
}) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center">
      {posters.map((poster, i) => {
        const isActive = i === activeIndex;
        return (
          <div
            key={poster.id}
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
            style={{ opacity: isActive ? 1 : 0 }}
          >
            {poster.image ? (
              <img
                src={poster.image}
                alt={poster.title}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div
                className="h-3/4 aspect-[8.5/11] rounded-lg"
                style={{ backgroundColor: `${theme.primary}60` }}
              />
            )}
          </div>
        );
      })}

      {/* Progress bar */}
      {posters.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/30 z-10">
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: theme.accent,
              boxShadow: `0 0 10px ${theme.accent}`,
            }}
          />
        </div>
      )}

      {/* Progress dots */}
      {posters.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {posters.map((_, idx) => (
            <div
              key={idx}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: idx === activeIndex ? theme.accent : 'rgba(255,255,255,0.3)',
                transform: idx === activeIndex ? 'scale(1.3)' : 'scale(1)',
                boxShadow: idx === activeIndex ? `0 0 10px ${theme.accent}` : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PosterFeed({ config, theme }: WidgetComponentProps) {
  const feedConfig = config as PosterFeedConfig | undefined;
  const feedUrl = feedConfig?.feedUrl;
  const rotationSeconds = feedConfig?.rotationSeconds ?? 8;
  const animationMode = feedConfig?.animationMode ?? 'stack';

  const [posters, setPosters] = useState<FeedPoster[]>(DEFAULT_POSTERS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch and parse RSS feed
  useEffect(() => {
    if (!feedUrl) {
      setPosters(DEFAULT_POSTERS);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchFeed = async () => {
      try {
        const { text } = await fetchTextWithCache(feedUrl, {
          cacheKey: buildCacheKey('poster-feed', feedUrl),
          ttlMs: 5 * 60 * 1000,
          allowStale: true,
        });

        if (cancelled) return;

        const items = parseRss(text);
        if (items.length === 0) {
          setError('No items found in feed');
          return;
        }

        const parsed: FeedPoster[] = items
          .map((item, i) => ({
            id: item.guid || `rss-${i}`,
            title: item.title,
            image: extractImage(item),
          }))
          .filter((p) => p.image); // only keep items that have an image

        if (parsed.length === 0) {
          setError('No images found in feed');
          return;
        }

        setPosters(parsed);
        setActiveIndex(0);
        setProgress(0);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load feed');
          console.error('PosterFeed fetch error:', err);
        }
      }
    };

    fetchFeed();
    const refreshInterval = setInterval(fetchFeed, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [feedUrl]);

  // Auto-rotation timer
  const advance = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % posters.length);
    setProgress(0);
  }, [posters.length]);

  useEffect(() => {
    if (posters.length <= 1) return;

    progressRef.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + 100 / (rotationSeconds * 10), 100));
    }, 100);

    timerRef.current = setInterval(advance, rotationSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [posters.length, rotationSeconds, advance]);

  if (error && posters === DEFAULT_POSTERS) {
    return (
      <div
        className="h-full rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-white/50 text-sm">{error}</span>
      </div>
    );
  }

  if (posters.length === 0) {
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
    <div className="w-full h-full rounded-2xl overflow-hidden" style={{ backgroundColor: `${theme.primary}20` }}>
      {animationMode === 'stack' && (
        <StackMode posters={posters} activeIndex={activeIndex} theme={theme} />
      )}
      {animationMode === 'carousel' && (
        <CarouselMode posters={posters} activeIndex={activeIndex} theme={theme} />
      )}
      {animationMode === 'fade' && (
        <FadeMode
          posters={posters}
          activeIndex={activeIndex}
          theme={theme}
          progress={progress}
        />
      )}
    </div>
  );
}

registerWidget({
  type: 'poster-feed',
  name: 'Poster Feed',
  description: 'RSS feed posters with stack, carousel, or fade animations',
  icon: '📰',
  minW: 3,
  minH: 2,
  defaultW: 6,
  defaultH: 4,
  component: PosterFeed,
  OptionsComponent: PosterFeedOptions,
  defaultProps: {
    rotationSeconds: 8,
    animationMode: 'stack',
  },
});
