'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import ConfessionsOptions from './ConfessionsOptions';

interface RawConfession {
  id?: number | string;
  testimonial?: string;
  by?: string;
  imgSrc?: string;
}

interface ConfessionItem {
  id: string;
  text: string;
  by: string;
}

interface ConfessionsConfig {
  apiUrl?: string;
  pageUrl?: string;
  maxItems?: number;
  rotationSeconds?: number;
  cacheTtlSeconds?: number;
  batchRefreshMinutes?: number;
  corsProxy?: string;
  showByline?: boolean;
}

interface WordPressPageResponse {
  id?: number;
  slug?: string;
  content?: {
    rendered?: string;
  };
}

const DEFAULT_API_URL =
  'https://overtheedge.unbc.ca/wp-json/wp/v2/pages?slug=confession&_fields=id,slug,content.rendered';
const DEFAULT_PAGE_URL = 'https://overtheedge.unbc.ca/confession/';
const MIN_TEXT_SIZE = 14;
const MAX_TEXT_SIZE = 38;

const decodeHtmlEntities = (value: string): string => {
  if (typeof window === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const toConfessionItems = (items: RawConfession[], maxItems: number): ConfessionItem[] =>
  items
    .map((item, index) => {
      const text = decodeHtmlEntities(String(item.testimonial ?? '')).trim();
      const by = decodeHtmlEntities(String(item.by ?? '')).trim();
      return {
        id: String(item.id ?? index),
        text,
        by,
      };
    })
    .filter((item) => item.text.length > 0)
    .slice(0, Math.max(1, maxItems));

const parseConfessionsFromMarkup = (html: string, maxItems: number): ConfessionItem[] => {
  if (typeof window === 'undefined') return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const container = doc.querySelector<HTMLElement>('.ote-confessions-block-container[data-confessions]')
    ?? doc.querySelector<HTMLElement>('[data-confessions]');
  const rawAttr = container?.getAttribute('data-confessions');
  if (!rawAttr) return [];

  try {
    const parsed = JSON.parse(rawAttr) as RawConfession[];
    return toConfessionItems(parsed, maxItems);
  } catch {
    try {
      const decoded = decodeHtmlEntities(rawAttr);
      const parsed = JSON.parse(decoded) as RawConfession[];
      return toConfessionItems(parsed, maxItems);
    } catch {
      return [];
    }
  }
};

const pickPage = (payload: WordPressPageResponse[] | WordPressPageResponse): WordPressPageResponse | null => {
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (payload && typeof payload === 'object') return payload;
  return null;
};

const appendCacheBust = (url: string, token: number): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_batch=${token}`;
};

export default function Confessions({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const confConfig = config as ConfessionsConfig | undefined;
  const apiUrl = confConfig?.apiUrl?.trim() || DEFAULT_API_URL;
  const pageUrl = confConfig?.pageUrl?.trim() || DEFAULT_PAGE_URL;
  const maxItems = Math.min(50, Math.max(1, Math.round(confConfig?.maxItems ?? 10)));
  const rotationSeconds = Math.min(120, Math.max(4, Math.round(confConfig?.rotationSeconds ?? 12)));
  const cacheTtlSeconds = Math.min(3600, Math.max(30, Math.round(confConfig?.cacheTtlSeconds ?? 300)));
  const batchRefreshMinutes = Math.min(24 * 60, Math.max(0, Number(confConfig?.batchRefreshMinutes ?? 15)));
  const corsProxy = confConfig?.corsProxy?.trim() || globalCorsProxy;
  const showByline = confConfig?.showByline ?? true;

  const [items, setItems] = useState<ConfessionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [textSizePx, setTextSizePx] = useState<number>(28);
  const textViewportRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  const fetchConfessions = useCallback(async (forceFresh = false) => {
    setError(null);
    setLoading(true);

    const ttlMs = cacheTtlSeconds * 1000;
    const cacheBustToken = forceFresh ? Date.now() : null;

    try {
      const pageApiUrlBase = buildProxyUrl(corsProxy, apiUrl);
      const pageApiUrl = cacheBustToken ? appendCacheBust(pageApiUrlBase, cacheBustToken) : pageApiUrlBase;
      const { data } = await fetchJsonWithCache<WordPressPageResponse[] | WordPressPageResponse>(
        pageApiUrl,
        {
          cacheKey: buildCacheKey(
            cacheBustToken ? 'confessions-api-fresh' : 'confessions-api',
            cacheBustToken ? `${apiUrl}:${cacheBustToken}` : apiUrl,
          ),
          ttlMs,
        },
      );

      const page = pickPage(data);
      const rendered = page?.content?.rendered ?? '';
      const parsed = parseConfessionsFromMarkup(rendered, maxItems);

      if (parsed.length > 0) {
        setItems(parsed);
        setActiveIndex(0);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback handled below.
    }

    try {
      const pageHtmlUrlBase = buildProxyUrl(corsProxy, pageUrl);
      const pageHtmlUrl = cacheBustToken ? appendCacheBust(pageHtmlUrlBase, cacheBustToken) : pageHtmlUrlBase;
      const { text } = await fetchTextWithCache(pageHtmlUrl, {
        cacheKey: buildCacheKey(
          cacheBustToken ? 'confessions-page-fresh' : 'confessions-page',
          cacheBustToken ? `${pageUrl}:${cacheBustToken}` : pageUrl,
        ),
        ttlMs,
      });
      const parsed = parseConfessionsFromMarkup(text, maxItems);
      if (parsed.length > 0) {
        setItems(parsed);
        setActiveIndex(0);
      } else {
        setError('No confessions found in source content.');
      }
    } catch {
      setError('Failed to load confessions feed.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, pageUrl, maxItems, cacheTtlSeconds, corsProxy]);

  useEffect(() => {
    fetchConfessions(false);
    if (batchRefreshMinutes <= 0) return;
    const interval = setInterval(() => {
      fetchConfessions(true);
    }, batchRefreshMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchConfessions, batchRefreshMinutes]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(
      () => setActiveIndex((prev) => (prev + 1) % items.length),
      rotationSeconds * 1000,
    );
    return () => clearInterval(interval);
  }, [items.length, rotationSeconds]);

  const current = useMemo(
    () => (items.length > 0 ? items[activeIndex % items.length] : null),
    [items, activeIndex],
  );

  useLayoutEffect(() => {
    const viewport = textViewportRef.current;
    const paragraph = textRef.current;
    if (!viewport || !paragraph || !current?.text) return;

    const fitText = () => {
      if (!viewport || !paragraph) return;

      const fits = (sizePx: number): boolean => {
        paragraph.style.fontSize = `${sizePx}px`;
        paragraph.style.lineHeight = '1.35';
        return (
          paragraph.scrollHeight <= viewport.clientHeight + 1 &&
          paragraph.scrollWidth <= viewport.clientWidth + 1
        );
      };

      let low = MIN_TEXT_SIZE;
      let high = MAX_TEXT_SIZE;

      if (!fits(low)) {
        setTextSizePx(MIN_TEXT_SIZE);
        return;
      }

      while (high - low > 0.5) {
        const mid = (low + high) / 2;
        if (fits(mid)) {
          low = mid;
        } else {
          high = mid;
        }
      }

      const next = Number(low.toFixed(1));
      setTextSizePx((prev) => (Math.abs(prev - next) > 0.1 ? next : prev));
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [current?.id, current?.text, showByline]);

  if (loading && items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6" style={{ backgroundColor: `${theme.primary}20` }}>
        <div className="text-center">
          <div className="text-white/80 text-lg font-semibold">Loading confessions...</div>
          <div className="text-white/50 text-sm mt-1">Fetching from WordPress REST content</div>
        </div>
      </div>
    );
  }

  if (error && !current) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6 text-center" style={{ backgroundColor: `${theme.primary}22` }}>
        <div>
          <div className="text-white/85 text-lg font-semibold">Confessions unavailable</div>
          <div className="text-white/60 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full p-6 overflow-hidden">
      <div
        className="h-full w-full rounded-2xl border flex flex-col"
        style={{
          borderColor: `${theme.accent}66`,
          backgroundColor: `${theme.primary}2a`,
        }}
      >
        <div
          className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: `${theme.accent}33` }}
        >
          <div className="text-sm font-semibold tracking-wide uppercase" style={{ color: theme.accent }}>
            UNBC Confessions
          </div>
          <div className="text-xs text-white/60">
            {items.length > 0 ? `${activeIndex + 1} / ${items.length}` : '0 / 0'}
          </div>
        </div>

        <div className="flex-1 p-5 md:p-6 overflow-hidden flex flex-col">
          {current ? (
            <>
              <div ref={textViewportRef} className="flex-1 min-h-0 overflow-hidden">
                <p
                  ref={textRef}
                  className="text-white font-medium break-words whitespace-pre-wrap"
                  style={{ fontSize: `${textSizePx}px`, lineHeight: 1.35 }}
                >
                  {current.text}
                </p>
              </div>
              {showByline && current.by && (
                <div className="mt-auto pt-5 text-sm md:text-base font-semibold" style={{ color: theme.accent }}>
                  {current.by}
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-white/60">
              No confessions available
            </div>
          )}
        </div>

        {items.length > 1 && (
          <div className="px-5 pb-4 flex gap-1.5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show confession ${index + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: index === activeIndex ? '26px' : '10px',
                  backgroundColor: index === activeIndex ? theme.accent : `${theme.accent}55`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'confessions',
  name: 'Confessions',
  description: 'UNBC confessions from overtheedge.unbc.ca',
  icon: 'newspaper',
  minW: 3,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: Confessions,
  OptionsComponent: ConfessionsOptions,
  defaultProps: {
    apiUrl: DEFAULT_API_URL,
    pageUrl: DEFAULT_PAGE_URL,
    maxItems: 10,
    rotationSeconds: 12,
    cacheTtlSeconds: 300,
    batchRefreshMinutes: 15,
    corsProxy: '',
    showByline: true,
  },
});
