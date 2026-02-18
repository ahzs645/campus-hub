'use client';

import { useState, useEffect } from 'react';
import { buildCacheKey, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { parseICal, parseRss } from '@/lib/feeds';

export interface CalendarEvent {
  id: string | number;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  color?: string;
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
  if (!corsProxy) return url;
  return `${corsProxy}${url}`;
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
        const { data } = await fetchJsonWithCache<Record<string, unknown>[] | { events: Record<string, unknown>[] }>(fetchUrl, {
          cacheKey: buildCacheKey('events-json', fetchUrl),
          ttlMs: cacheTtlSeconds * 1000,
        });
        const list = Array.isArray(data) ? data : data.events;
        if (Array.isArray(list) && isMounted) {
          const normalized = list.map((item, index) => {
            if (item.date && typeof item.date === 'string' && !/^\d{4}-/.test(item.date)) {
              return { ...item, id: (item.id as string | number) ?? `${item.title}-${index}` } as unknown as CalendarEvent;
            }
            const rawStart = (item.startDate ?? item.start_date ?? item.start ?? item.date) as string | undefined;
            const startObj = rawStart ? new Date(rawStart) : null;
            return {
              id: (item.id as string | number) ?? `${item.title}-${index}`,
              title: item.title as string,
              date: formatDate(startObj),
              time: startObj && !isNaN(startObj.getTime()) ? formatTime(startObj) : '',
              location: (item.location ?? '') as string,
              category: (item.category as string) ?? undefined,
              color: (item.color as string) ?? undefined,
            } satisfies CalendarEvent;
          });
          const filtered = selectedCategories && selectedCategories.length > 0
            ? normalized.filter(e => !e.category || selectedCategories.includes(e.category))
            : normalized;
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
