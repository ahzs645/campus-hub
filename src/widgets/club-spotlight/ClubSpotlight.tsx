'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import ClubSpotlightOptions from './ClubSpotlightOptions';

interface ClubItem {
  id: string;
  name: string;
  image: string;
}

interface ClubSpotlightConfig {
  pageUrl?: string;
  rotationSeconds?: number;
  corsProxy?: string;
  useCorsProxy?: boolean;
  refreshMinutes?: number;
}

const DEFAULT_PAGE_URL = 'https://overtheedge.unbc.ca/clubs/';

const DEFAULT_CLUBS: ClubItem[] = [
  { id: '1', name: 'Outdoors Club', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=300&h=300&fit=crop' },
  { id: '2', name: 'Debate Society', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=300&h=300&fit=crop' },
  { id: '3', name: 'Photography Club', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=300&h=300&fit=crop' },
];

/** Parse clubs from the overtheedge.unbc.ca/clubs/ HTML page. */
function parseClubsFromHtml(html: string): ClubItem[] {
  if (typeof window === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // The clubs page on Over The Edge uses WordPress with club cards.
  // Try multiple selectors to find club entries.
  const clubs: ClubItem[] = [];

  // Strategy 1: Look for article/card elements with images and titles
  const articles = doc.querySelectorAll('article, .club, .club-card, .wp-block-group, .ote-club');
  articles.forEach((el, i) => {
    const img = el.querySelector('img');
    const heading = el.querySelector('h1, h2, h3, h4, h5, h6, .club-name, .title');
    if (img && heading) {
      const image = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const name = heading.textContent?.trim() || '';
      if (name && image) {
        clubs.push({ id: `club-${i}`, name, image });
      }
    }
  });

  if (clubs.length > 0) return clubs;

  // Strategy 2: Look for figure + figcaption or image + adjacent text patterns
  const figures = doc.querySelectorAll('figure');
  figures.forEach((fig, i) => {
    const img = fig.querySelector('img');
    const caption = fig.querySelector('figcaption');
    if (img) {
      const image = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const name = caption?.textContent?.trim() || img.getAttribute('alt')?.trim() || '';
      if (name && image) {
        clubs.push({ id: `fig-${i}`, name, image });
      }
    }
  });

  if (clubs.length > 0) return clubs;

  // Strategy 3: Find all images within the content area with alt text
  const contentArea = doc.querySelector('.entry-content, .page-content, main, .content');
  if (contentArea) {
    const images = contentArea.querySelectorAll('img');
    images.forEach((img, i) => {
      const image = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const alt = img.getAttribute('alt')?.trim() || '';
      // Skip tiny icons, logos, decorative images
      const width = parseInt(img.getAttribute('width') || '999', 10);
      if (alt && image && width > 50 && !image.includes('icon') && !image.includes('logo')) {
        // Try to find a nearby heading
        const parent = img.closest('div, a, li, td');
        const heading = parent?.querySelector('h1, h2, h3, h4, h5, h6');
        const name = heading?.textContent?.trim() || alt;
        clubs.push({ id: `img-${i}`, name, image });
      }
    });
  }

  return clubs;
}

export default function ClubSpotlight({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const cfg = config as ClubSpotlightConfig | undefined;
  const pageUrl = cfg?.pageUrl?.trim() || DEFAULT_PAGE_URL;
  const rotationSeconds = Math.max(4, Math.min(120, cfg?.rotationSeconds ?? 10));
  const useCorsProxy = cfg?.useCorsProxy ?? true;
  const corsProxy = useCorsProxy ? (cfg?.corsProxy?.trim() || globalCorsProxy) : undefined;
  const refreshMinutes = Math.max(5, Math.min(1440, cfg?.refreshMinutes ?? 30));

  const [clubs, setClubs] = useState<ClubItem[]>(DEFAULT_CLUBS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchClubs = useCallback(async () => {
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, pageUrl);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('club-spotlight', pageUrl),
        ttlMs: refreshMinutes * 60 * 1000,
        allowStale: true,
      });
      const parsed = parseClubsFromHtml(text);
      if (parsed.length > 0) {
        setClubs(parsed);
        setActiveIndex(0);
        setUsingDefaults(false);
      } else {
        setError('No clubs found on page');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clubs');
    }
  }, [corsProxy, pageUrl, refreshMinutes]);

  useEffect(() => {
    fetchClubs();
    const interval = setInterval(fetchClubs, refreshMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchClubs, refreshMinutes]);

  // Auto-rotation
  useEffect(() => {
    if (clubs.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % clubs.length);
    }, rotationSeconds * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clubs.length, rotationSeconds]);

  const DESIGN_W = 380;
  const DESIGN_H = 340;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  const current = clubs[activeIndex % clubs.length];

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col items-center justify-center p-6"
      >
        {/* Header */}
        <div
          className="text-sm font-semibold tracking-wide uppercase mb-4"
          style={{ color: theme.accent }}
        >
          Club Spotlight
        </div>

        {/* Club Image */}
        <div
          className="w-40 h-40 rounded-full overflow-hidden border-4 mb-4 transition-all duration-700"
          style={{ borderColor: theme.accent }}
        >
          {current?.image ? (
            <img
              key={current.id}
              src={current.image}
              alt={current.name}
              className="w-full h-full object-cover transition-opacity duration-500"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/30"
              style={{ backgroundColor: `${theme.primary}60` }}
            >
              {current?.name?.charAt(0) || '?'}
            </div>
          )}
        </div>

        {/* Club Name */}
        <div className="text-2xl font-bold text-white text-center leading-tight mb-2 px-4 truncate max-w-full">
          {current?.name || 'Loading...'}
        </div>

        {/* Progress dots */}
        {clubs.length > 1 && (
          <div className="flex gap-1.5 mt-2">
            {clubs.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? 20 : 8,
                  backgroundColor: i === activeIndex ? theme.accent : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}

        {/* Error / defaults notice */}
        {error && usingDefaults && (
          <div className="text-xs text-white/40 mt-2">Sample data — configure CORS proxy to load clubs</div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'club-spotlight',
  name: 'Club Spotlight',
  description: 'Rotating spotlight of campus clubs from Over The Edge',
  icon: 'users',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: ClubSpotlight,
  OptionsComponent: ClubSpotlightOptions,
  defaultProps: {
    pageUrl: DEFAULT_PAGE_URL,
    rotationSeconds: 10,
    corsProxy: '',
    useCorsProxy: true,
    refreshMinutes: 30,
  },
});
