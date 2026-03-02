'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function Confessions({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const confConfig = config as ConfessionsConfig | undefined;
  const apiUrl = confConfig?.apiUrl?.trim() || DEFAULT_API_URL;
  const pageUrl = confConfig?.pageUrl?.trim() || DEFAULT_PAGE_URL;
  const maxItems = Math.min(50, Math.max(1, Math.round(confConfig?.maxItems ?? 10)));
  const rotationSeconds = Math.min(120, Math.max(4, Math.round(confConfig?.rotationSeconds ?? 12)));
  const cacheTtlSeconds = Math.min(3600, Math.max(30, Math.round(confConfig?.cacheTtlSeconds ?? 300)));
  const corsProxy = confConfig?.corsProxy?.trim() || globalCorsProxy;
  const showByline = confConfig?.showByline ?? true;

  const [items, setItems] = useState<ConfessionItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfessions = useCallback(async () => {
    setError(null);
    setLoading(true);

    const ttlMs = cacheTtlSeconds * 1000;

    try {
      const pageApiUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data } = await fetchJsonWithCache<WordPressPageResponse[] | WordPressPageResponse>(
        pageApiUrl,
        {
          cacheKey: buildCacheKey('confessions-api', apiUrl),
          ttlMs,
        },
      );

      const page = pickPage(data);
      const rendered = page?.content?.rendered ?? '';
      const parsed = parseConfessionsFromMarkup(rendered, maxItems);

      if (parsed.length > 0) {
        setItems(parsed);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback handled below.
    }

    try {
      const pageHtmlUrl = buildProxyUrl(corsProxy, pageUrl);
      const { text } = await fetchTextWithCache(pageHtmlUrl, {
        cacheKey: buildCacheKey('confessions-page', pageUrl),
        ttlMs,
      });
      const parsed = parseConfessionsFromMarkup(text, maxItems);
      if (parsed.length > 0) {
        setItems(parsed);
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
    fetchConfessions();
    const interval = setInterval(fetchConfessions, cacheTtlSeconds * 1000);
    return () => clearInterval(interval);
  }, [fetchConfessions, cacheTtlSeconds]);

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
              <p className="text-white leading-relaxed text-lg md:text-xl font-medium line-clamp-[10]">
                {current.text}
              </p>
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
    corsProxy: '',
    showByline: true,
  },
});
