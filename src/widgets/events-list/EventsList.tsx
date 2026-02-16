'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { parseICal, parseRss } from '@/lib/feeds';
import EventsListOptions from './EventsListOptions';

interface Event {
  id: string | number;
  title: string;
  date?: string;
  time?: string;
  location?: string;
}

interface EventsListConfig {
  apiUrl?: string;
  sourceType?: 'json' | 'ical' | 'rss';
  corsProxy?: string;
  cacheTtlSeconds?: number;
  events?: Event[];
  maxItems?: number;
  title?: string;
}

const DEFAULT_EVENTS: Event[] = [
  { id: 1, title: 'Club Fair', date: 'Mar 10', time: '11:00 AM', location: 'Student Center' },
  { id: 2, title: 'Guest Lecture: AI Ethics', date: 'Mar 11', time: '2:00 PM', location: 'Hall B' },
  { id: 3, title: 'Open Mic Night', date: 'Mar 12', time: '7:00 PM', location: 'Coffee House' },
  { id: 4, title: 'Study Abroad Info Session', date: 'Mar 13', time: '3:30 PM', location: 'Room 204' },
  { id: 5, title: 'Yoga on the Lawn', date: 'Mar 14', time: '8:00 AM', location: 'West Lawn' },
];

const applyCorsProxy = (url: string, corsProxy?: string) => {
  if (!corsProxy) return url;
  return `${corsProxy}${url}`;
};

const formatDate = (value: Date | null): string => {
  if (!value) return '';
  return value.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatTime = (value: Date | null): string => {
  if (!value) return '';
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function EventsList({ config, theme }: WidgetComponentProps) {
  const eventsConfig = config as EventsListConfig | undefined;
  const apiUrl = eventsConfig?.apiUrl;
  const sourceType = eventsConfig?.sourceType ?? 'json';
  const corsProxy = eventsConfig?.corsProxy?.trim();
  const cacheTtlSeconds = eventsConfig?.cacheTtlSeconds ?? 300;
  const maxItems = eventsConfig?.maxItems ?? 10;
  const title = eventsConfig?.title ?? 'Upcoming Events';

  const [events, setEvents] = useState<Event[]>(eventsConfig?.events ?? DEFAULT_EVENTS);

  useEffect(() => {
    if (apiUrl) return;
    setEvents(eventsConfig?.events ?? DEFAULT_EVENTS);
  }, [apiUrl, eventsConfig?.events]);

  useEffect(() => {
    if (!apiUrl) return;

    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const fetchUrl = applyCorsProxy(apiUrl, corsProxy);
        if (sourceType === 'ical') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('events-ical', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
          const parsed = parseICal(text);
          const mapped = parsed.map((event, index) => {
            const isAllDay = event.startRaw?.trim().length === 8;
            return {
              id: event.uid ?? `${event.summary}-${index}`,
              title: event.summary,
              date: formatDate(event.start ?? null),
              time: isAllDay ? '' : formatTime(event.start ?? null),
              location: event.location ?? '',
            } satisfies Event;
          });
          if (isMounted) setEvents(mapped.slice(0, maxItems));
          return;
        }

        if (sourceType === 'rss') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('events-rss', fetchUrl),
            ttlMs: cacheTtlSeconds * 1000,
          });
          const parsed = parseRss(text);
          const mapped = parsed.map((item, index) => {
            const dateObj = item.pubDate ? new Date(item.pubDate) : null;
            return {
              id: item.guid ?? item.link ?? `${item.title}-${index}`,
              title: item.title,
              date: formatDate(dateObj),
              time: formatTime(dateObj),
              location: item.categories?.[0] ?? '',
            } satisfies Event;
          });
          if (isMounted) setEvents(mapped.slice(0, maxItems));
          return;
        }

        const { data } = await fetchJsonWithCache<Record<string, unknown>[] | { events: Record<string, unknown>[] }>(fetchUrl, {
          cacheKey: buildCacheKey('events-json', fetchUrl),
          ttlMs: cacheTtlSeconds * 1000,
        });
        const list = Array.isArray(data) ? data : data.events;
        if (Array.isArray(list) && isMounted) {
          const normalized = list.map((item, index) => {
            // If the event already has date/time strings, use as-is
            if (item.date && typeof item.date === 'string' && !/^\d{4}-/.test(item.date)) {
              return { ...item, id: (item.id as string | number) ?? `${item.title}-${index}` } as unknown as Event;
            }
            // Normalize events with ISO startDate/endDate (e.g. WordPress REST APIs)
            const rawStart = (item.startDate ?? item.start_date ?? item.start ?? item.date) as string | undefined;
            const startObj = rawStart ? new Date(rawStart) : null;
            return {
              id: (item.id as string | number) ?? `${item.title}-${index}`,
              title: item.title as string,
              date: formatDate(startObj),
              time: startObj && !isNaN(startObj.getTime()) ? formatTime(startObj) : '',
              location: (item.location ?? '') as string,
            } satisfies Event;
          });
          setEvents(normalized.slice(0, maxItems));
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiUrl, sourceType, corsProxy, cacheTtlSeconds, maxItems]);

  return (
    <div className="h-full flex flex-col min-h-0 p-6">
      {/* Header */}
      <h3
        className="flex-shrink-0 text-3xl font-bold mb-5 flex items-center gap-4"
        style={{ color: theme.accent }}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="font-display">{title}</span>
        <div className="flex-1 h-px ml-2" style={{ backgroundColor: `${theme.accent}30` }} />
      </h3>

      {/* Events list */}
      <div className="flex-1 space-y-3 overflow-y-auto min-h-0 hide-scrollbar pr-1">
        {events.slice(0, maxItems).map((event, index) => (
          <div
            key={event.id ?? index}
            className="p-5 rounded-xl border-l-4 transition-all duration-300 hover:translate-x-1"
            style={{
              backgroundColor: `${theme.primary}50`,
              borderColor: theme.accent,
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="font-semibold text-white text-xl leading-snug">
              {event.title}
            </div>
            <div className="text-base opacity-90 flex items-center gap-3 mt-2 flex-wrap">
              {event.date && (
                <span
                  className="font-bold px-3 py-1 rounded text-base"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                >
                  {event.date}
                </span>
              )}
              {event.time && <span className="text-white/70">{event.time}</span>}
              {event.location && (
                <span className="text-white/50 flex items-center gap-1.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {event.location}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'events-list',
  name: 'Events List',
  description: 'Display upcoming campus events',
  icon: '📅',
  minW: 3,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: EventsList,
  OptionsComponent: EventsListOptions,
  defaultProps: {
    maxItems: 10,
    title: 'Upcoming Events',
    sourceType: 'json',
    cacheTtlSeconds: 300,
    corsProxy: '',
  },
});
