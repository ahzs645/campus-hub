'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { parseRss } from '@/lib/feeds';
import { useEvents, applyCorsProxy, type CalendarEvent } from '@/hooks/useEvents';
import NewsTickerOptions from './NewsTickerOptions';

interface TickerItem {
  id: string | number;
  label: string;
  text: string;
}

interface NewsTickerConfig {
  apiUrl?: string;
  sourceType?: 'json' | 'rss';
  corsProxy?: string;
  cacheTtlSeconds?: number;
  items?: TickerItem[];
  speed?: number;
  scale?: number;
  label?: string;
  dataSource?: 'announcements' | 'events';
  eventApiUrl?: string;
  eventSourceType?: 'json' | 'ical' | 'rss';
  eventCorsProxy?: string;
  eventCacheTtlSeconds?: number;
  eventMaxItems?: number;
}

const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  { id: 1, label: 'REMINDER', text: 'Library closes at 10PM tonight for maintenance' },
  { id: 2, label: 'WEATHER', text: 'Rain expected this afternoon — bring an umbrella!' },
  { id: 3, label: 'SPORTS', text: 'Basketball team advances to regional finals — Game Saturday 7PM' },
  { id: 4, label: 'ALERT', text: 'Parking Lot B closed tomorrow for resurfacing' },
  { id: 5, label: 'EVENT', text: 'Free pizza at Student Center — 12PM today while supplies last' },
];

const DEFAULT_TICKER_EVENTS: CalendarEvent[] = [
  { id: 1, title: 'Club Fair', date: 'Mar 10', time: '11:00 AM', location: 'Student Center' },
  { id: 2, title: 'Guest Lecture: AI Ethics', date: 'Mar 11', time: '2:00 PM', location: 'Hall B' },
  { id: 3, title: 'Open Mic Night', date: 'Mar 12', time: '7:00 PM', location: 'Coffee House' },
  { id: 4, title: 'Study Abroad Info Session', date: 'Mar 13', time: '3:30 PM', location: 'Room 204' },
  { id: 5, title: 'Yoga on the Lawn', date: 'Mar 14', time: '8:00 AM', location: 'West Lawn' },
];

const EVENT_DOT_COLORS = [
  '#6366f1', // blue
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
];

export default function NewsTicker({ config, theme }: WidgetComponentProps) {
  const tickerConfig = config as NewsTickerConfig | undefined;
  const apiUrl = tickerConfig?.apiUrl;
  const sourceType = tickerConfig?.sourceType ?? 'json';
  const corsProxy = tickerConfig?.corsProxy?.trim();
  const cacheTtlSeconds = tickerConfig?.cacheTtlSeconds ?? 120;
  const speed = tickerConfig?.speed ?? 30;
  const configuredScale = tickerConfig?.scale;
  const userScale =
    typeof configuredScale === 'number' && Number.isFinite(configuredScale)
      ? Math.min(2, Math.max(0.5, configuredScale))
      : 1;
  const label = tickerConfig?.label ?? 'Breaking';
  const dataSource = tickerConfig?.dataSource ?? 'announcements';

  // Announcement items state
  const [items, setItems] = useState<TickerItem[]>(tickerConfig?.items ?? DEFAULT_TICKER_ITEMS);

  useEffect(() => {
    if (dataSource !== 'announcements' || apiUrl) return;
    setItems(tickerConfig?.items ?? DEFAULT_TICKER_ITEMS);
  }, [dataSource, apiUrl, tickerConfig?.items]);

  useEffect(() => {
    if (dataSource !== 'announcements' || !apiUrl) return;
    let isMounted = true;

    const fetchTicker = async () => {
      try {
        const fetchUrl = applyCorsProxy(apiUrl, corsProxy);
        if (sourceType === 'rss') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('ticker-rss', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
          const parsed = parseRss(text);
          const mapped = parsed.map((item, index) => ({
            id: item.guid ?? item.link ?? `${item.title}-${index}`,
            label: item.categories?.[0] ?? label ?? 'NEWS',
            text: item.title,
          }));
          if (isMounted) setItems(mapped);
          return;
        }

        const { data } = await fetchJsonWithCache<TickerItem[]>(fetchUrl, {
          cacheKey: buildCacheKey('ticker-json', fetchUrl),
          ttlMs: cacheTtlSeconds * 1000,
        });
        if (Array.isArray(data) && isMounted) {
          setItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch ticker items:', error);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dataSource, apiUrl, sourceType, corsProxy, cacheTtlSeconds, label]);

  // Events data via shared hook
  const events = useEvents({
    apiUrl: dataSource === 'events' ? tickerConfig?.eventApiUrl : undefined,
    sourceType: tickerConfig?.eventSourceType ?? 'json',
    corsProxy: tickerConfig?.eventCorsProxy?.trim(),
    cacheTtlSeconds: tickerConfig?.eventCacheTtlSeconds ?? 300,
    maxItems: tickerConfig?.eventMaxItems ?? 10,
    pollIntervalMs: 30_000,
    defaultEvents: DEFAULT_TICKER_EVENTS,
  });

  const isEventsMode = dataSource === 'events';
  const tickerContent = isEventsMode ? [] : [...items, ...items];
  const tickerEvents = isEventsMode ? [...events, ...events] : [];

  // Uniformly scale the ticker to fill its row height (designed at 70px),
  // then apply user scale from widget options.
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const updateScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nextScale = el.clientHeight / 70;
    setFitScale(nextScale > 0 ? nextScale : 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScale]);

  const renderScale = Math.max(0.01, fitScale * userScale);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-full"
      style={{ backgroundColor: theme.accent }}
    >
      <div
        style={{
          transform: `scale(${renderScale})`,
          transformOrigin: 'top left',
          width: `${100 / renderScale}%`,
          height: `${100 / renderScale}%`,
        }}
        className="relative"
      >
        {/* Label */}
        <div
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-8 font-bold text-lg uppercase tracking-widest"
          style={{ backgroundColor: theme.primary, color: theme.accent }}
        >
          <span className="relative flex h-3 w-3 mr-3">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: theme.accent }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ backgroundColor: theme.accent }}
            />
          </span>
          {label}
        </div>

        {/* Scrolling Content */}
        <div
          className="flex whitespace-nowrap py-4 pl-48 items-center animate-ticker h-full"
          style={{
            animationDuration: `${speed}s`,
          }}
        >
          {isEventsMode
            ? tickerEvents.map((event, idx) => (
                <div key={`${event.id}-${idx}`} className="inline-flex items-center mx-6 gap-3">
                  {event.time && (
                    <span
                      className="px-3 py-1.5 rounded-lg text-sm font-bold tracking-wide whitespace-nowrap"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.accent,
                      }}
                    >
                      {event.time}
                    </span>
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: EVENT_DOT_COLORS[idx % EVENT_DOT_COLORS.length],
                      boxShadow: `0 0 8px ${EVENT_DOT_COLORS[idx % EVENT_DOT_COLORS.length]}80`,
                    }}
                  />
                  <span
                    className="font-semibold text-xl whitespace-nowrap"
                    style={{ color: theme.primary }}
                  >
                    {event.title}
                  </span>
                  {event.date && (
                    <span
                      className="text-sm opacity-60 whitespace-nowrap"
                      style={{ color: theme.primary }}
                    >
                      {event.date}
                    </span>
                  )}
                  <span className="mx-6 text-3xl" style={{ color: `${theme.primary}50` }}>
                    &bull;
                  </span>
                </div>
              ))
            : tickerContent.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="inline-flex items-center mx-10">
                  <span
                    className="px-4 py-1.5 rounded-full text-sm font-bold uppercase mr-4 tracking-wide"
                    style={{ backgroundColor: theme.primary, color: theme.accent }}
                  >
                    {item.label}
                  </span>
                  <span className="font-semibold text-xl" style={{ color: theme.primary }}>
                    {item.text}
                  </span>
                  <span className="mx-10 text-3xl" style={{ color: `${theme.primary}50` }}>
                    &bull;
                  </span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'news-ticker',
  name: 'News Ticker',
  description: 'Scrolling announcements and alerts',
  icon: '📢',
  minW: 4,
  minH: 1,
  defaultW: 99, // Sentinel: addWidget clamps to gridCols for full-width
  defaultH: 1,
  component: NewsTicker,
  OptionsComponent: NewsTickerOptions,
  defaultProps: {
    speed: 30,
    scale: 1,
    label: 'Breaking',
    dataSource: 'announcements',
    sourceType: 'json',
    cacheTtlSeconds: 120,
    corsProxy: '',
    eventSourceType: 'json',
    eventCacheTtlSeconds: 300,
    eventCorsProxy: '',
    eventMaxItems: 10,
  },
});
