'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import AppIcon from '@/components/AppIcon';
import RSSReaderOptions from './RSSReaderOptions';

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface RSSConfig {
  feedUrl?: string;
  maxItems?: number;
  refreshInterval?: number;
  showDescription?: boolean;
  showDate?: boolean;
  scrollSpeed?: number;
  title?: string;
  corsProxy?: string;
}

const DEMO_ITEMS: FeedItem[] = [
  { title: 'Campus Library Extends Hours for Finals Week', link: '#', description: 'The main library will remain open 24/7 during the upcoming finals period to support student study needs.', pubDate: new Date(Date.now() - 3600000).toISOString() },
  { title: 'Spring Career Fair — March 28', link: '#', description: 'Over 50 employers will be on campus. Bring your resume and dress professionally.', pubDate: new Date(Date.now() - 7200000).toISOString() },
  { title: 'New Shuttle Route Added to North Campus', link: '#', description: 'A new express route connects the north residence halls directly to the science complex.', pubDate: new Date(Date.now() - 14400000).toISOString() },
  { title: 'Student Government Election Results', link: '#', description: 'Congratulations to the newly elected student body president and council members.', pubDate: new Date(Date.now() - 28800000).toISOString() },
  { title: 'Campus Sustainability Initiative Launches', link: '#', description: 'New recycling stations and composting bins installed across all dining facilities.', pubDate: new Date(Date.now() - 43200000).toISOString() },
];

function parseRSSXml(xml: string): { title: string; items: FeedItem[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  // Try RSS 2.0 first
  const channel = doc.querySelector('channel');
  if (channel) {
    const feedTitle = channel.querySelector(':scope > title')?.textContent ?? 'RSS Feed';
    const items = Array.from(channel.querySelectorAll('item')).map((item) => ({
      title: item.querySelector('title')?.textContent ?? '',
      link: item.querySelector('link')?.textContent ?? '',
      description: (item.querySelector('description')?.textContent ?? '').replace(/<[^>]*>/g, '').trim(),
      pubDate: item.querySelector('pubDate')?.textContent ?? '',
    }));
    return { title: feedTitle, items };
  }

  // Try Atom
  const feed = doc.querySelector('feed');
  if (feed) {
    const feedTitle = feed.querySelector(':scope > title')?.textContent ?? 'Feed';
    const items = Array.from(feed.querySelectorAll('entry')).map((entry) => ({
      title: entry.querySelector('title')?.textContent ?? '',
      link: entry.querySelector('link')?.getAttribute('href') ?? '',
      description: (entry.querySelector('summary, content')?.textContent ?? '').replace(/<[^>]*>/g, '').trim(),
      pubDate: entry.querySelector('published, updated')?.textContent ?? '',
    }));
    return { title: feedTitle, items };
  }

  return { title: 'Feed', items: [] };
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RSSReader({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const rssConfig = config as RSSConfig | undefined;
  const feedUrl = rssConfig?.feedUrl?.trim() || '';
  const maxItems = rssConfig?.maxItems ?? 10;
  const refreshInterval = rssConfig?.refreshInterval ?? 15;
  const showDescription = rssConfig?.showDescription ?? true;
  const showDate = rssConfig?.showDate ?? true;
  const scrollSpeed = rssConfig?.scrollSpeed ?? 40;
  const customTitle = rssConfig?.title?.trim() || '';
  const corsProxy = rssConfig?.corsProxy?.trim() || globalCorsProxy;

  const [items, setItems] = useState<FeedItem[]>(DEMO_ITEMS);
  const [feedTitle, setFeedTitle] = useState(customTitle || 'Campus News');
  const [error, setError] = useState<string | null>(null);
  const [scrollNeeded, setScrollNeeded] = useState(false);

  const { containerRef, scale } = useFitScale(480, 600);

  const fetchFeed = useCallback(async () => {
    if (!feedUrl) {
      setItems(DEMO_ITEMS);
      setFeedTitle(customTitle || 'Campus News');
      return;
    }
    try {
      setError(null);
      const url = buildProxyUrl(corsProxy, feedUrl);
      const { text } = await fetchTextWithCache(url, {
        cacheKey: buildCacheKey('rss', feedUrl),
        ttlMs: refreshInterval * 60 * 1000,
      });
      const parsed = parseRSSXml(text);
      if (parsed.items.length === 0) {
        setError('No items found in feed');
        return;
      }
      setItems(parsed.items.slice(0, maxItems));
      setFeedTitle(customTitle || parsed.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    }
  }, [feedUrl, corsProxy, refreshInterval, maxItems, customTitle]);

  useEffect(() => {
    fetchFeed();
    if (feedUrl) {
      const interval = setInterval(fetchFeed, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchFeed, feedUrl, refreshInterval]);

  // Check if scrolling is needed
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(() => {
      setScrollNeeded(node.scrollHeight > node.clientHeight + 4);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const totalHeight = items.length * (showDescription ? 100 : 50);
  const duration = totalHeight > 0 ? (totalHeight / 30) * (scrollSpeed / 10) : 30;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}10` }}
    >
      <div
        style={{
          width: 480,
          height: 600,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${theme.accent}20` }}>
          <AppIcon name="rss" className="w-5 h-5" style={{ color: theme.accent }} />
          <span className="text-lg font-semibold text-white truncate">{feedTitle}</span>
          {!feedUrl && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 ml-auto">Demo</span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-3 text-sm text-red-400 shrink-0">
            {error}
          </div>
        )}

        {/* Items */}
        <div ref={contentRef} className="flex-1 overflow-hidden relative">
          <div
            className={scrollNeeded ? 'rss-scroll' : ''}
            style={scrollNeeded ? { animationDuration: `${duration}s` } : undefined}
          >
            {items.map((item, i) => (
              <div
                key={`${item.title}-${i}`}
                className="px-5 py-3"
                style={{ borderBottom: `1px solid ${theme.accent}10` }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium text-white leading-snug">{item.title}</div>
                    {showDescription && item.description && (
                      <div className="text-sm text-white/50 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </div>
                    )}
                    {showDate && item.pubDate && (
                      <div className="text-xs mt-1" style={{ color: `${theme.accent}90` }}>
                        {timeAgo(item.pubDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fade edges */}
          {scrollNeeded && (
            <>
              <div
                className="absolute top-0 left-0 right-0 h-6 pointer-events-none"
                style={{ background: `linear-gradient(to bottom, ${theme.background || '#1a1a2e'}, transparent)` }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
                style={{ background: `linear-gradient(to top, ${theme.background || '#1a1a2e'}, transparent)` }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'rss-reader',
  name: 'RSS Reader',
  description: 'Display RSS or Atom feed content',
  icon: 'rss',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 4,
  component: RSSReader,
  OptionsComponent: RSSReaderOptions,
  defaultProps: {
    feedUrl: '',
    maxItems: 10,
    refreshInterval: 15,
    showDescription: true,
    showDate: true,
    scrollSpeed: 40,
    title: '',
    corsProxy: '',
  },
});
