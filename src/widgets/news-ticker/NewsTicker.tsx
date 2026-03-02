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

type AnnouncementSourceType = 'json' | 'rss' | 'simcity-template';

interface NewsTickerConfig {
  apiUrl?: string;
  sourceType?: AnnouncementSourceType;
  corsProxy?: string;
  cacheTtlSeconds?: number;
  items?: TickerItem[];
  speed?: number;
  scale?: number;
  label?: string;
  templateCityName?: string;
  templateMayorName?: string;
  templateRandomSimName?: string;
  templateRandomWorkplaceName?: string;
  templateSim?: string;
  templateSims?: string;
  simcityCategories?: string;
  simcityMaxItems?: number;
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

const DEFAULT_SIMCITY_API_URL = '/data/simcity_news_tickers.json';
const DEFAULT_SIMCITY_MAX_ITEMS = 40;
const HANDLEBARS_TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const LEGACY_TOKEN = /~([A-Za-z0-9_]+)~/g;
const TEMPLATE_TOKEN_ALIASES: Record<string, keyof TemplateValues> = {
  sim: 'sim',
  sims: 'sims',
  cityname: 'cityName',
  mayorname: 'mayorName',
  randomsimname: 'randomSimName',
  randomworkplacename: 'randomWorkplaceName',
};
const SIM_FIRST_NAMES = [
  'Alex',
  'Riley',
  'Jordan',
  'Morgan',
  'Taylor',
  'Casey',
  'Skyler',
  'Avery',
];
const SIM_LAST_NAMES = [
  'Mercer',
  'Stone',
  'Park',
  'Santos',
  'Nguyen',
  'Bennett',
  'Holloway',
  'Rivera',
];
const SIM_WORKPLACES = [
  'SimTech Labs',
  'Sunrise Diner',
  'Metro Transit Hub',
  'Riverfront Power Plant',
  'Northside Police Precinct',
  'Harbor Logistics Yard',
  'City Hall Annex',
  'Midtown Clinic',
];

interface TemplateValues {
  cityName: string;
  mayorName: string;
  randomSimName: string;
  randomWorkplaceName: string;
  sim: string;
  sims: string;
}

interface SimCityLine {
  category: string;
  text: string;
  id: string;
}

const pickRandom = (pool: string[]): string => pool[Math.floor(Math.random() * pool.length)] ?? '';

const randomSimName = () => `${pickRandom(SIM_FIRST_NAMES)} ${pickRandom(SIM_LAST_NAMES)}`;
const randomWorkplaceName = () => pickRandom(SIM_WORKPLACES);

const normalizeTokenKey = (token: string): string => token.replace(/\s+/g, '').toLowerCase();
const normalizeCategoryKey = (category: string): string =>
  category.trim().toLowerCase().replace(/[\s-]+/g, '_');

const formatCategoryLabel = (category: string, fallback: string): string => {
  const cleaned = category.trim().replace(/[_-]+/g, ' ');
  return (cleaned || fallback).toUpperCase();
};

const parseCategoryFilter = (raw: string | undefined): Set<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((part) => normalizeCategoryKey(part))
      .filter(Boolean),
  );

const clampSimCityMaxItems = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SIMCITY_MAX_ITEMS;
  return Math.min(200, Math.max(1, Math.round(value)));
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildTemplateValues = (config: NewsTickerConfig | undefined): TemplateValues => ({
  cityName: config?.templateCityName?.trim() || 'SimCity',
  mayorName: config?.templateMayorName?.trim() || 'Mayor Sim',
  randomSimName: config?.templateRandomSimName?.trim() || '',
  randomWorkplaceName: config?.templateRandomWorkplaceName?.trim() || '',
  sim: config?.templateSim?.trim() || 'Sim',
  sims: config?.templateSims?.trim() || 'Sims',
});

const resolveTemplateToken = (token: string, values: TemplateValues): string | undefined => {
  const alias = TEMPLATE_TOKEN_ALIASES[normalizeTokenKey(token)];
  return alias ? values[alias] : undefined;
};

const applyTemplate = (template: string, values: TemplateValues): string => {
  const lineValues: TemplateValues = {
    ...values,
    randomSimName: values.randomSimName || randomSimName(),
    randomWorkplaceName: values.randomWorkplaceName || randomWorkplaceName(),
  };

  return template
    .replace(HANDLEBARS_TOKEN, (match, token) => resolveTemplateToken(token, lineValues) ?? match)
    .replace(LEGACY_TOKEN, (match, token) => resolveTemplateToken(token, lineValues) ?? match);
};

const toSimCityLines = (data: unknown): SimCityLine[] => {
  const lines: SimCityLine[] = [];

  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      if (typeof item === 'string' && item.trim()) {
        lines.push({ category: 'news', text: item, id: `root-${idx}` });
      }
    });
    return lines;
  }

  if (!data || typeof data !== 'object') return lines;
  const payload = data as Record<string, unknown>;

  if (Array.isArray(payload.items)) {
    payload.items.forEach((item, idx) => {
      if (typeof item === 'string' && item.trim()) {
        lines.push({ category: 'news', text: item, id: `items-${idx}` });
        return;
      }
      if (!item || typeof item !== 'object') return;
      const record = item as Record<string, unknown>;
      const text = typeof record.text === 'string' ? record.text : '';
      if (!text.trim()) return;
      const category = typeof record.label === 'string' ? record.label : 'news';
      const id = typeof record.id === 'string' || typeof record.id === 'number' ? String(record.id) : `items-${idx}`;
      lines.push({ category, text, id });
    });
  }

  if (!payload.categories || typeof payload.categories !== 'object' || Array.isArray(payload.categories)) {
    return lines;
  }

  Object.entries(payload.categories as Record<string, unknown>).forEach(([category, value]) => {
    if (!Array.isArray(value)) return;
    value.forEach((line, idx) => {
      if (typeof line !== 'string' || !line.trim()) return;
      lines.push({
        category,
        text: line,
        id: `${category}-${idx}`,
      });
    });
  });

  return lines;
};

const mapSimCityTickerItems = (
  data: unknown,
  {
    fallbackLabel,
    templateValues,
    categoryFilter,
    maxItems,
  }: {
    fallbackLabel: string;
    templateValues: TemplateValues;
    categoryFilter: Set<string>;
    maxItems: number;
  },
): TickerItem[] => {
  const parsed = toSimCityLines(data);
  if (parsed.length === 0) return [];

  const filtered =
    categoryFilter.size > 0
      ? parsed.filter((line) => categoryFilter.has(normalizeCategoryKey(line.category)))
      : parsed;

  const source = filtered.length > 0 ? filtered : parsed;
  return shuffle(source)
    .slice(0, maxItems)
    .map((line, idx) => ({
      id: `${line.id}-${idx}`,
      label: formatCategoryLabel(line.category, fallbackLabel || 'NEWS'),
      text: applyTemplate(line.text, templateValues),
    }));
};

export default function NewsTicker({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const tickerConfig = config as NewsTickerConfig | undefined;
  const rawApiUrl = tickerConfig?.apiUrl?.trim();
  const apiUrl = rawApiUrl && rawApiUrl.length > 0 ? rawApiUrl : undefined;
  const sourceType = tickerConfig?.sourceType ?? 'json';
  const announcementsApiUrl =
    sourceType === 'simcity-template' ? apiUrl || DEFAULT_SIMCITY_API_URL : apiUrl;
  const configuredItems = tickerConfig?.items;
  const simcityCategories = tickerConfig?.simcityCategories;
  const templateCityName = tickerConfig?.templateCityName;
  const templateMayorName = tickerConfig?.templateMayorName;
  const templateRandomSimName = tickerConfig?.templateRandomSimName;
  const templateRandomWorkplaceName = tickerConfig?.templateRandomWorkplaceName;
  const templateSim = tickerConfig?.templateSim;
  const templateSims = tickerConfig?.templateSims;
  const corsProxy = tickerConfig?.corsProxy?.trim();
  const cacheTtlSeconds = tickerConfig?.cacheTtlSeconds ?? 120;
  const simcityMaxItems = clampSimCityMaxItems(tickerConfig?.simcityMaxItems);
  const speed = tickerConfig?.speed ?? 30;
  const configuredScale = tickerConfig?.scale;
  const userScale =
    typeof configuredScale === 'number' && Number.isFinite(configuredScale)
      ? Math.min(2, Math.max(0.5, configuredScale))
      : 1;
  const label = tickerConfig?.label ?? 'Breaking';
  const dataSource = tickerConfig?.dataSource ?? 'announcements';

  // Announcement items state
  const [items, setItems] = useState<TickerItem[]>(configuredItems ?? DEFAULT_TICKER_ITEMS);

  useEffect(() => {
    if (dataSource !== 'announcements' || announcementsApiUrl) return;
    setItems(configuredItems ?? DEFAULT_TICKER_ITEMS);
  }, [dataSource, announcementsApiUrl, configuredItems]);

  useEffect(() => {
    if (dataSource !== 'announcements' || !announcementsApiUrl) return;
    let isMounted = true;

    const fetchTicker = async () => {
      try {
        const fetchUrl = applyCorsProxy(announcementsApiUrl, corsProxy);
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

        if (sourceType === 'simcity-template') {
          const { data } = await fetchJsonWithCache<unknown>(fetchUrl, {
            cacheKey: buildCacheKey('ticker-simcity-json', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
          const mapped = mapSimCityTickerItems(data, {
            fallbackLabel: label,
            templateValues: buildTemplateValues({
              templateCityName,
              templateMayorName,
              templateRandomSimName,
              templateRandomWorkplaceName,
              templateSim,
              templateSims,
            }),
            categoryFilter: parseCategoryFilter(simcityCategories),
            maxItems: simcityMaxItems,
          });
          if (isMounted && mapped.length > 0) {
            setItems(mapped);
          }
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
  }, [
    dataSource,
    announcementsApiUrl,
    sourceType,
    corsProxy,
    cacheTtlSeconds,
    label,
    simcityMaxItems,
    simcityCategories,
    templateCityName,
    templateMayorName,
    templateRandomSimName,
    templateRandomWorkplaceName,
    templateSim,
    templateSims,
  ]);

  // Events data via shared hook
  const events = useEvents({
    apiUrl: dataSource === 'events' ? tickerConfig?.eventApiUrl : undefined,
    sourceType: tickerConfig?.eventSourceType ?? 'json',
    corsProxy: tickerConfig?.eventCorsProxy?.trim() || globalCorsProxy,
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
  icon: 'megaphone',
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
    templateCityName: 'SimCity',
    templateMayorName: 'Mayor Sim',
    templateRandomSimName: '',
    templateRandomWorkplaceName: '',
    templateSim: 'Sim',
    templateSims: 'Sims',
    simcityCategories: '',
    simcityMaxItems: 40,
    eventSourceType: 'json',
    eventCacheTtlSeconds: 300,
    eventCorsProxy: '',
    eventMaxItems: 10,
  },
});
