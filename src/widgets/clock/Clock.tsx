'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import ClockOptions from './ClockOptions';

interface ClockConfig {
  showSeconds?: boolean;
  showDate?: boolean;
  format24h?: boolean;
}

export default function Clock({ config, theme }: WidgetComponentProps) {
  const [time, setTime] = useState<Date | null>(null);
  const clockConfig = config as ClockConfig | undefined;
  const showSeconds = clockConfig?.showSeconds ?? false;
  const showDate = clockConfig?.showDate ?? true;
  const format24h = clockConfig?.format24h ?? false;

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div className="h-full flex flex-col items-end justify-center p-4">
        <div className="h-12 w-32 rounded animate-pulse" style={{ backgroundColor: `${theme.accent}20` }} />
      </div>
    );
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: !format24h,
  };

  return (
    <div className="h-full flex flex-col items-end justify-center p-4 font-clock">
      <div
        className="text-4xl xl:text-5xl font-bold tracking-tight tabular-nums"
        style={{ color: theme.accent }}
      >
        {time.toLocaleTimeString([], timeOptions)}
      </div>
      {showDate && (
        <div className="text-sm xl:text-base opacity-80 mt-1 font-medium tracking-wide text-white/80">
          {time.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      )}
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'clock',
  name: 'Clock',
  description: 'Displays current time and date',
  icon: '🕐',
  minW: 2,
  minH: 1,
  defaultW: 3,
  defaultH: 1,
  component: Clock,
  OptionsComponent: ClockOptions,
  defaultProps: {
    showSeconds: false,
    showDate: true,
    format24h: false,
  },
});
