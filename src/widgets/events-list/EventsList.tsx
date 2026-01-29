'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import EventsListOptions from './EventsListOptions';

interface Event {
  id: string | number;
  title: string;
  date: string;
  time: string;
  location: string;
}

interface EventsListConfig {
  apiUrl?: string;
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

export default function EventsList({ config, theme }: WidgetComponentProps) {
  const eventsConfig = config as EventsListConfig | undefined;
  const apiUrl = eventsConfig?.apiUrl;
  const maxItems = eventsConfig?.maxItems ?? 10;
  const title = eventsConfig?.title ?? 'Upcoming Events';

  const [events, setEvents] = useState<Event[]>(eventsConfig?.events ?? DEFAULT_EVENTS);

  useEffect(() => {
    if (!apiUrl) return;

    const fetchEvents = async () => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (Array.isArray(data)) {
          setEvents(data.slice(0, maxItems));
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [apiUrl, maxItems]);

  return (
    <div className="h-full flex flex-col min-h-0 p-4">
      {/* Header */}
      <h3
        className="flex-shrink-0 text-lg font-bold mb-4 flex items-center gap-3"
        style={{ color: theme.accent }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="flex-1 space-y-2 overflow-y-auto min-h-0 hide-scrollbar pr-1">
        {events.map((event, index) => (
          <div
            key={event.id}
            className="p-3 rounded-xl border-l-4 transition-all duration-300 hover:translate-x-1"
            style={{
              backgroundColor: `${theme.primary}50`,
              borderColor: theme.accent,
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="font-semibold text-white text-sm leading-snug">
              {event.title}
            </div>
            <div className="text-xs opacity-90 flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className="font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
              >
                {event.date}
              </span>
              <span className="text-white/70">{event.time}</span>
              <span className="text-white/50 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  },
});
