'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import QRCodeLib from 'qrcode';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import ClubSpotlightOptions from './ClubSpotlightOptions';

interface ClubItem {
  id: string;
  name: string;
  image: string;
  link: string;
}

interface ClubSpotlightConfig {
  pageUrl?: string;
  apiUrl?: string;
  rotationSeconds?: number;
  corsProxy?: string;
  useCorsProxy?: boolean;
  refreshMinutes?: number;
  showQrCode?: boolean;
  qrLabel?: string;
}

// WordPress REST API for organization custom post type with embedded featured images.
// org_status 181=Established, 183=Probationary, 182=New — excludes dissolved/inactive.
const DEFAULT_API_URL = 'https://overtheedge.unbc.ca/wp-json/wp/v2/organization?per_page=100&_embed=wp:featuredmedia&org_status=181,183,182';
const DEFAULT_PAGE_URL = 'https://overtheedge.unbc.ca/clubs/';

const DEFAULT_CLUBS: ClubItem[] = [
  { id: '1', name: 'Outdoors Club', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=300&h=300&fit=crop', link: '' },
  { id: '2', name: 'Debate Society', image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=300&h=300&fit=crop', link: '' },
  { id: '3', name: 'Photography Club', image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=300&h=300&fit=crop', link: '' },
];

const decodeHtmlEntities = (value: string): string => {
  if (typeof window === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

// WordPress REST API response shape for a custom post type with _embed
interface WpClubPost {
  id?: number;
  title?: { rendered?: string };
  link?: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      media_details?: {
        sizes?: {
          medium?: { source_url?: string };
          thumbnail?: { source_url?: string };
          full?: { source_url?: string };
        };
      };
    }>;
  };
  // Fallback: featured image might be in content
  content?: { rendered?: string };
}

/** Parse clubs from WP REST API JSON response */
function parseClubsFromApi(posts: WpClubPost[]): ClubItem[] {
  return posts
    .map((post) => {
      const name = decodeHtmlEntities(post.title?.rendered ?? '').trim();
      if (!name) return null;

      // Try to get featured image from _embedded
      const media = post._embedded?.['wp:featuredmedia']?.[0];
      const sizes = media?.media_details?.sizes as Record<string, { source_url?: string }> | undefined;
      const image =
        sizes?.['ote-card-thumbnail']?.source_url ??
        sizes?.medium?.source_url ??
        sizes?.['ote-hero-image']?.source_url ??
        sizes?.full?.source_url ??
        media?.source_url ??
        '';

      // If no featured image, try to extract from content HTML
      let finalImage = image;
      if (!finalImage && post.content?.rendered) {
        const imgMatch = post.content.rendered.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) finalImage = imgMatch[1];
      }

      return { id: String(post.id ?? name), name, image: finalImage, link: post.link ?? '' };
    })
    .filter((c): c is ClubItem => c !== null && c.name.length > 0);
}

/** Parse clubs from the overtheedge.unbc.ca/clubs/ HTML page. */
function parseClubsFromHtml(html: string): ClubItem[] {
  if (typeof window === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // The clubs page on Over The Edge uses WordPress with club cards.
  // Try multiple selectors to find club entries.
  const clubs: ClubItem[] = [];

  // Strategy 1: WordPress block post template (used on overtheedge.unbc.ca/clubs/)
  // Clubs are rendered as <li> elements inside .wp-block-post-template with
  // <h3 class="wp-block-post-title"> for names and <img> for images.
  const postItems = doc.querySelectorAll('.wp-block-post-template li, .wp-block-post-template > *');
  postItems.forEach((el, i) => {
    const img = el.querySelector('img');
    const heading = el.querySelector('.wp-block-post-title, h1, h2, h3, h4, h5, h6');
    const image = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
    const name = heading?.textContent?.trim() || img?.getAttribute('alt')?.trim() || '';
    const link = el.querySelector('a')?.getAttribute('href') || '';
    if (name) {
      clubs.push({ id: `wp-${i}`, name, image, link });
    }
  });

  if (clubs.length > 0) return clubs;

  // Strategy 2: Look for article/card elements with images and titles
  const articles = doc.querySelectorAll('article, .club, .club-card, .wp-block-group, .ote-club');
  articles.forEach((el, i) => {
    const img = el.querySelector('img');
    const heading = el.querySelector('h1, h2, h3, h4, h5, h6, .club-name, .title');
    if (heading) {
      const image = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
      const name = heading.textContent?.trim() || '';
      const link = el.querySelector('a')?.getAttribute('href') || '';
      if (name) {
        clubs.push({ id: `club-${i}`, name, image, link });
      }
    }
  });

  if (clubs.length > 0) return clubs;

  // Strategy 3: Look for figure + figcaption or image + adjacent text patterns
  const figures = doc.querySelectorAll('figure');
  figures.forEach((fig, i) => {
    const img = fig.querySelector('img');
    const caption = fig.querySelector('figcaption');
    if (img) {
      const image = img.getAttribute('src') || img.getAttribute('data-src') || '';
      const name = caption?.textContent?.trim() || img.getAttribute('alt')?.trim() || '';
      if (name && image) {
        clubs.push({ id: `fig-${i}`, name, image, link: '' });
      }
    }
  });

  if (clubs.length > 0) return clubs;

  // Strategy 4: Find all images within the content area with alt text
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
        clubs.push({ id: `img-${i}`, name, image, link: '' });
      }
    });
  }

  return clubs;
}

export default function ClubSpotlight({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const cfg = config as ClubSpotlightConfig | undefined;
  const apiUrl = cfg?.apiUrl?.trim() || DEFAULT_API_URL;
  const pageUrl = cfg?.pageUrl?.trim() || DEFAULT_PAGE_URL;
  const rotationSeconds = Math.max(4, Math.min(120, cfg?.rotationSeconds ?? 10));
  const useCorsProxy = cfg?.useCorsProxy ?? true;
  const corsProxy = useCorsProxy ? (cfg?.corsProxy?.trim() || globalCorsProxy) : undefined;
  const refreshMinutes = Math.max(5, Math.min(1440, cfg?.refreshMinutes ?? 30));
  const showQrCode = cfg?.showQrCode ?? false;
  const qrLabel = cfg?.qrLabel ?? 'Learn more';

  const [clubs, setClubs] = useState<ClubItem[]>(DEFAULT_CLUBS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchClubs = useCallback(async () => {
    setError(null);
    const ttlMs = refreshMinutes * 60 * 1000;

    // Strategy 1: Try the WordPress REST API (returns structured JSON with images)
    try {
      const apiFetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data: posts } = await fetchJsonWithCache<WpClubPost[]>(apiFetchUrl, {
        cacheKey: buildCacheKey('club-spotlight-api', apiUrl),
        ttlMs,
        allowStale: true,
      });
      const parsed = parseClubsFromApi(Array.isArray(posts) ? posts : []);
      if (parsed.length > 0) {
        setClubs(parsed);
        setActiveIndex(0);
        setUsingDefaults(false);
        return;
      }
    } catch {
      // API failed — fall through to HTML scraping
    }

    // Strategy 2: Scrape the HTML page directly
    try {
      const pageFetchUrl = buildProxyUrl(corsProxy, pageUrl);
      const { text } = await fetchTextWithCache(pageFetchUrl, {
        cacheKey: buildCacheKey('club-spotlight-page', pageUrl),
        ttlMs,
        allowStale: true,
      });
      const parsed = parseClubsFromHtml(text);
      if (parsed.length > 0) {
        setClubs(parsed);
        setActiveIndex(0);
        setUsingDefaults(false);
        return;
      }
    } catch {
      // HTML scrape also failed
    }

    setError('Could not load clubs from API or page');
  }, [corsProxy, apiUrl, pageUrl, refreshMinutes]);

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

  // QR code for current club page
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const current = clubs[activeIndex % clubs.length];
  const currentLink = current?.link || '';

  useEffect(() => {
    if (!showQrCode || !currentLink) {
      setQrDataUrl(null);
      return;
    }
    QRCodeLib.toDataURL(currentLink, {
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
      margin: 1,
      width: 256,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [showQrCode, currentLink]);

  // Portrait: taller with larger image; landscape: side-by-side layout
  const { containerRef, scale, designWidth: DESIGN_W, designHeight: DESIGN_H, isLandscape } = useAdaptiveFitScale({
    landscape: { w: 420, h: 260 },
    portrait: { w: 280, h: 380 },
  });

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
        className={`flex ${isLandscape ? 'items-center gap-6' : 'flex-col items-center justify-center'} p-6`}
      >
        {/* Club Image */}
        <div
          className={`${isLandscape ? 'w-32 h-32' : 'w-40 h-40'} rounded-full overflow-hidden border-4 ${isLandscape ? '' : 'mb-4'} transition-all duration-700 flex-shrink-0`}
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

        {/* Club details */}
        <div className={isLandscape ? 'flex flex-col min-w-0' : ''}>
          {/* Header */}
          {isLandscape && (
            <div
              className="text-sm font-semibold tracking-wide uppercase mb-2"
              style={{ color: theme.accent }}
            >
              Club Spotlight
            </div>
          )}
          {!isLandscape && (
            <div
              className="text-sm font-semibold tracking-wide uppercase mb-4"
              style={{ color: theme.accent }}
            >
              Club Spotlight
            </div>
          )}

          {/* Club Name */}
          <div className={`text-2xl font-bold text-white ${isLandscape ? 'text-left' : 'text-center'} leading-tight mb-2`}>
            {current?.name || 'Loading...'}
          </div>

          {/* Progress dots */}
          {clubs.length > 1 && (
            <div className={`flex gap-1.5 mt-2 ${!isLandscape ? 'justify-center' : ''}`}>
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

        {/* QR Code */}
        {showQrCode && qrDataUrl && (
          <div className={`flex flex-col items-center flex-shrink-0 ${isLandscape ? '' : 'mt-3'}`}>
            <img
              src={qrDataUrl}
              alt={qrLabel}
              className="w-16 h-16 rounded"
              style={{ objectFit: 'contain' }}
            />
            {qrLabel && (
              <span className="text-[9px] text-white/50 mt-1 whitespace-nowrap">{qrLabel}</span>
            )}
          </div>
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
    apiUrl: 'https://overtheedge.unbc.ca/wp-json/wp/v2/organization?per_page=100&_embed=wp:featuredmedia&org_status=181,183,182',
    pageUrl: DEFAULT_PAGE_URL,
    rotationSeconds: 10,
    corsProxy: '',
    useCorsProxy: true,
    refreshMinutes: 30,
    showQrCode: false,
    qrLabel: 'Learn more',
  },
});
