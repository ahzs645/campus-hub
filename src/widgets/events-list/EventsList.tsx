'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useEvents, type CalendarEvent } from '@/hooks/useEvents';
import EventsListOptions from './EventsListOptions';

type Event = CalendarEvent;

type DisplayMode = 'scroll' | 'ticker' | 'paginate';

interface EventsListConfig {
  apiUrl?: string;
  sourceType?: 'json' | 'ical' | 'rss';
  corsProxy?: string;
  cacheTtlSeconds?: number;
  events?: Event[];
  maxItems?: number;
  title?: string;
  displayMode?: DisplayMode;
  rotationSeconds?: number;
  selectedCategories?: string[];
}

const DEFAULT_EVENTS: Event[] = [
  { id: 1, title: 'Club Fair', date: 'Mar 10', time: '11:00 AM', location: 'Student Center' },
  { id: 2, title: 'Guest Lecture: AI Ethics', date: 'Mar 11', time: '2:00 PM', location: 'Hall B' },
  { id: 3, title: 'Open Mic Night', date: 'Mar 12', time: '7:00 PM', location: 'Coffee House' },
  { id: 4, title: 'Study Abroad Info Session', date: 'Mar 13', time: '3:30 PM', location: 'Room 204' },
  { id: 5, title: 'Yoga on the Lawn', date: 'Mar 14', time: '8:00 AM', location: 'West Lawn' },
];

// Approximate heights (px) used to compute how many cards fit.
// card = p-5 (40) + title (~28) + details (~32) + gap (12) ≈ 112px, rounded up
const CARD_HEIGHT = 120;
// padding (24+24) + header+mb (56+20) + progress+dots (4+12+10+16) = ~166px
const CHROME_HEIGHT = 170;

export default function EventsList({ config, theme }: WidgetComponentProps) {
  const eventsConfig = config as EventsListConfig | undefined;
  const apiUrl = eventsConfig?.apiUrl;
  const sourceType = eventsConfig?.sourceType ?? 'json';
  const corsProxy = eventsConfig?.corsProxy?.trim();
  const cacheTtlSeconds = eventsConfig?.cacheTtlSeconds ?? 300;
  const maxItems = eventsConfig?.maxItems ?? 10;
  const title = eventsConfig?.title ?? 'Upcoming Events';
  const displayMode = eventsConfig?.displayMode ?? 'scroll';
  const rotationSeconds = eventsConfig?.rotationSeconds ?? 5;
  const selectedCategories = eventsConfig?.selectedCategories;

  const events = useEvents({
    apiUrl,
    sourceType,
    corsProxy,
    cacheTtlSeconds,
    maxItems,
    pollIntervalMs: 30_000,
    defaultEvents: eventsConfig?.events ?? DEFAULT_EVENTS,
    selectedCategories,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  /* ---------- measure container & compute items per page ---------- */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.clientHeight;
      const available = h - CHROME_HEIGHT;
      const fits = Math.max(1, Math.floor(available / CARD_HEIGHT));
      setItemsPerPage(fits);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- ticker / paginate logic ---------- */

  const displayEvents = events.slice(0, maxItems);
  const totalEvents = displayEvents.length;

  const totalPages = displayMode === 'paginate'
    ? Math.max(1, Math.ceil(totalEvents / itemsPerPage))
    : totalEvents;

  const currentPage = displayMode === 'paginate'
    ? Math.floor(currentIndex / itemsPerPage)
    : currentIndex;

  // Reset index when events change, mode switches, or items-per-page changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [displayMode, totalEvents, itemsPerPage]);

  // Auto-advance for ticker and paginate modes
  const advance = useCallback(() => {
    if (totalEvents === 0) return;
    setCurrentIndex(prev => {
      if (displayMode === 'paginate') {
        const nextPage = Math.floor(prev / itemsPerPage) + 1;
        const nextStart = nextPage * itemsPerPage;
        return nextStart >= totalEvents ? 0 : nextStart;
      }
      return (prev + 1) % totalEvents;
    });
  }, [displayMode, totalEvents, itemsPerPage]);

  useEffect(() => {
    if (displayMode === 'scroll' || totalEvents <= 1) return;
    if (displayMode === 'paginate' && totalPages <= 1) return;

    const interval = setInterval(advance, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [displayMode, rotationSeconds, totalEvents, totalPages, advance]);

  /* ---------- shared renderers ---------- */

  const renderEventCard = (event: Event, index: number, grow = false) => (
    <div
      key={event.id ?? index}
      className={`p-5 rounded-xl border-l-4 overflow-hidden${grow ? ' flex-1 min-h-0 flex flex-col justify-center' : ''}`}
      style={{
        backgroundColor: `${theme.primary}50`,
        borderColor: event.color ?? theme.accent,
      }}
    >
      <div className={`font-semibold text-white leading-snug line-clamp-2 ${grow ? 'text-2xl' : 'text-xl'}`}>
        {event.title}
      </div>
      <div className={`opacity-90 flex items-center gap-3 mt-2 flex-wrap flex-shrink-0 ${grow ? 'text-lg' : 'text-base'}`}>
        {event.date && (
          <span
            className={`font-bold px-3 py-1 rounded ${grow ? 'text-lg' : 'text-base'}`}
            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
          >
            {event.date}
          </span>
        )}
        {event.time && <span className="text-white/70">{event.time}</span>}
        {event.location && (
          <span className="text-white/50 flex items-center gap-1.5">
            <svg className={grow ? 'w-6 h-6' : 'w-5 h-5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {event.location}
          </span>
        )}
      </div>
    </div>
  );

  const renderDots = (count: number, active: number) => (
    <div className="flex items-center justify-center gap-2 mt-4">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all duration-300"
          style={{
            backgroundColor: i === active ? theme.accent : `${theme.accent}30`,
            transform: i === active ? 'scale(1.3)' : 'scale(1)',
          }}
          onClick={() => setCurrentIndex(displayMode === 'paginate' ? i * itemsPerPage : i)}
        />
      ))}
    </div>
  );

  const renderProgressBar = () =>
    displayMode !== 'scroll' && totalEvents > 1 && (displayMode !== 'paginate' || totalPages > 1) ? (
      <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.accent}15` }}>
        <div
          ref={progressRef}
          className="h-full rounded-full"
          style={{
            backgroundColor: `${theme.accent}60`,
            animation: `events-progress ${rotationSeconds}s linear infinite`,
          }}
        />
      </div>
    ) : null;

  /* ---------- render ---------- */

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden flex flex-col min-h-0 p-6">
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
        {displayMode !== 'scroll' && totalEvents > 1 && (
          <span className="text-sm font-normal opacity-60 whitespace-nowrap">
            {displayMode === 'ticker'
              ? `${currentIndex + 1} / ${totalEvents}`
              : `Page ${currentPage + 1} / ${totalPages}`}
          </span>
        )}
      </h3>

      {/* Scroll mode – original scrollable list */}
      {displayMode === 'scroll' && (
        <div className="flex-1 space-y-3 overflow-y-auto min-h-0 hide-scrollbar pr-1">
          {displayEvents.map((event, index) => renderEventCard(event, index))}
        </div>
      )}

      {/* Ticker mode – one event at a time, vertical slide */}
      {displayMode === 'ticker' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative overflow-hidden">
            {displayEvents.map((event, index) => (
              <div
                key={event.id ?? index}
                className="absolute inset-0 flex items-start transition-all duration-500 ease-in-out"
                style={{
                  opacity: index === currentIndex ? 1 : 0,
                  transform: index === currentIndex
                    ? 'translateY(0)'
                    : index < currentIndex
                      ? 'translateY(-100%)'
                      : 'translateY(100%)',
                  pointerEvents: index === currentIndex ? 'auto' : 'none',
                }}
              >
                <div className="w-full">{renderEventCard(event, index)}</div>
              </div>
            ))}
          </div>
          {renderProgressBar()}
          {totalEvents > 1 && renderDots(totalEvents, currentIndex)}
        </div>
      )}

      {/* Paginate mode – chunks slide horizontally, sized to fit */}
      {displayMode === 'paginate' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative overflow-hidden">
            {Array.from({ length: totalPages }).map((_, pageIdx) => {
              const pageStart = pageIdx * itemsPerPage;
              const pageEvents = displayEvents.slice(pageStart, pageStart + itemsPerPage);
              const isActive = pageIdx === currentPage;
              return (
                <div
                  key={pageIdx}
                  className="absolute inset-0 transition-all duration-500 ease-in-out"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive
                      ? 'translateX(0)'
                      : pageIdx < currentPage
                        ? 'translateX(-100%)'
                        : 'translateX(100%)',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  <div className="h-full flex flex-col gap-3">
                    {pageEvents.map((event, i) => renderEventCard(event, pageStart + i, true))}
                  </div>
                </div>
              );
            })}
          </div>
          {renderProgressBar()}
          {totalPages > 1 && renderDots(totalPages, currentPage)}
        </div>
      )}
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'events-list',
  name: 'Events List',
  description: 'Display upcoming campus events',
  icon: 'calendar',
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
    displayMode: 'scroll',
    rotationSeconds: 5,
  },
});
