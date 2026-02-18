'use client';

import { useState, useEffect } from 'react';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { parseICal, parseRss } from '@/lib/feeds';

export interface CalendarEvent {
  id: string | number;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  color?: string;
  /** Raw start timestamp for sorting — not displayed */
  _sortTs?: number;
}

export interface UseEventsOptions {
  apiUrl?: string;
  sourceType?: 'json' | 'ical' | 'rss';
  corsProxy?: string;
  cacheTtlSeconds?: number;
  maxItems?: number;
  pollIntervalMs?: number;
  defaultEvents?: CalendarEvent[];
  selectedCategories?: string[];
}

export const applyCorsProxy = (url: string, corsProxy?: string) => {
  return buildProxyUrl(corsProxy, url);
};

export const formatDate = (value: Date | null): string => {
  if (!value) return '';
  return value.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const formatTime = (value: Date | null): string => {
  if (!value) return '';
  return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function useEvents(options: UseEventsOptions): CalendarEvent[] {
  const {
    apiUrl,
    sourceType = 'json',
    corsProxy,
    cacheTtlSeconds = 300,
    maxItems = 10,
    pollIntervalMs = 30_000,
    defaultEvents = [],
    selectedCategories,
  } = options;

  const trimmedProxy = corsProxy?.trim();

  const [events, setEvents] = useState<CalendarEvent[]>(defaultEvents);

  // Sync from defaultEvents when no apiUrl
  useEffect(() => {
    if (apiUrl) return;
    setEvents(defaultEvents);
  }, [apiUrl, defaultEvents]);

  // Fetch from API
  useEffect(() => {
    if (!apiUrl) return;

    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const fetchUrl = applyCorsProxy(apiUrl, trimmedProxy);

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
            } satisfies CalendarEvent;
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
            } satisfies CalendarEvent;
          });
          if (isMounted) setEvents(mapped.slice(0, maxItems));
          return;
        }

        // JSON source
        const { data } = await fetchJsonWithCache<Record<string, unknown>>(fetchUrl, {
          cacheKey: buildCacheKey('events-json', fetchUrl),
          ttlMs: cacheTtlSeconds * 1000,
        });
        const list = Array.isArray(data) ? data : (data.events as Record<string, unknown>[] | undefined);
        // eventMetadata is keyed by event ID and may contain location, organization, etc.
        const metadata: Record<string, Record<string, unknown>> = (!Array.isArray(data) && data.eventMetadata ? data.eventMetadata as Record<string, Record<string, unknown>> : {});
        if (Array.isArray(list) && isMounted) {
          const normalized = list.map((item, index) => {
            if (item.date && typeof item.date === 'string' && !/^\d{4}-/.test(item.date)) {
              return { ...item, id: (item.id as string | number) ?? `${item.title}-${index}` } as unknown as CalendarEvent;
            }
            const rawStart = (item.startDate ?? item.start_date ?? item.start ?? item.date) as string | undefined;
            const startObj = rawStart ? new Date(rawStart) : null;
            const itemId = (item.id as string | number) ?? `${item.title}-${index}`;
            const meta = metadata[String(itemId)];
            return {
              id: itemId,
              title: item.title as string,
              date: formatDate(startObj),
              time: startObj && !isNaN(startObj.getTime()) ? formatTime(startObj) : '',
              location: (meta?.location as string) || (item.location as string) || '',
              category: (item.category as string) ?? undefined,
              color: (item.color as string) ?? undefined,
              _sortTs: startObj && !isNaN(startObj.getTime()) ? startObj.getTime() : Infinity,
            } satisfies CalendarEvent;
          });
          // Filter out past events (keep today and future)
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const upcoming = normalized.filter(e => !e._sortTs || e._sortTs === Infinity || e._sortTs >= todayStart.getTime());
          upcoming.sort((a, b) => (a._sortTs ?? Infinity) - (b._sortTs ?? Infinity));
          const filtered = selectedCategories && selectedCategories.length > 0
            ? upcoming.filter(e => !e.category || selectedCategories.includes(e.category))
            : upcoming;
          setEvents(filtered.slice(0, maxItems));
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, pollIntervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiUrl, sourceType, trimmedProxy, cacheTtlSeconds, maxItems, pollIntervalMs, selectedCategories]);

  return events;
}
