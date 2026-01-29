'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import NewsTickerOptions from './NewsTickerOptions';

interface TickerItem {
  id: string | number;
  label: string;
  text: string;
}

interface NewsTickerConfig {
  apiUrl?: string;
  items?: TickerItem[];
  speed?: number;
  label?: string;
}

const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  { id: 1, label: 'REMINDER', text: 'Library closes at 10PM tonight for maintenance' },
  { id: 2, label: 'WEATHER', text: 'Rain expected this afternoon — bring an umbrella!' },
  { id: 3, label: 'SPORTS', text: 'Basketball team advances to regional finals — Game Saturday 7PM' },
  { id: 4, label: 'ALERT', text: 'Parking Lot B closed tomorrow for resurfacing' },
  { id: 5, label: 'EVENT', text: 'Free pizza at Student Center — 12PM today while supplies last' },
];

export default function NewsTicker({ config, theme }: WidgetComponentProps) {
  const tickerConfig = config as NewsTickerConfig | undefined;
  const apiUrl = tickerConfig?.apiUrl;
  const speed = tickerConfig?.speed ?? 30;
  const label = tickerConfig?.label ?? 'Breaking';

  const [items, setItems] = useState<TickerItem[]>(tickerConfig?.items ?? DEFAULT_TICKER_ITEMS);

  useEffect(() => {
    if (!apiUrl) return;

    const fetchTicker = async () => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (Array.isArray(data)) {
          setItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch ticker items:', error);
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [apiUrl]);

  const tickerContent = [...items, ...items]; // Duplicate for seamless loop

  return (
    <div className="relative overflow-hidden h-full" style={{ backgroundColor: theme.accent }}>
      {/* Breaking News Label */}
      <div
        className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-6 font-bold text-sm uppercase tracking-widest"
        style={{ backgroundColor: theme.primary, color: theme.accent }}
      >
        <span className="relative flex h-2 w-2 mr-3">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: theme.accent }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: theme.accent }}
          />
        </span>
        {label}
      </div>

      {/* Scrolling Content */}
      <div
        className="flex whitespace-nowrap py-4 pl-40 items-center animate-ticker"
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {tickerContent.map((item, idx) => (
          <div key={`${item.id}-${idx}`} className="inline-flex items-center mx-8">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold uppercase mr-3 tracking-wide"
              style={{ backgroundColor: theme.primary, color: theme.accent }}
            >
              {item.label}
            </span>
            <span className="font-semibold text-base" style={{ color: theme.primary }}>
              {item.text}
            </span>
            <span className="mx-8 text-2xl" style={{ color: `${theme.primary}50` }}>
              •
            </span>
          </div>
        ))}
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
  minW: 12,
  minH: 1,
  maxH: 1,
  defaultW: 12,
  defaultH: 1,
  component: NewsTicker,
  OptionsComponent: NewsTickerOptions,
  defaultProps: {
    speed: 30,
    label: 'Breaking',
  },
});
