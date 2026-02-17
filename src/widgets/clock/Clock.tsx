'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import ClockOptions from './ClockOptions';

interface ClockConfig {
  showSeconds?: boolean;
  showDate?: boolean;
  format24h?: boolean;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'center' | 'bottom';
}

export default function Clock({ config, theme }: WidgetComponentProps) {
  const [time, setTime] = useState<Date | null>(null);
  const clockConfig = config as ClockConfig | undefined;
  const showSeconds = clockConfig?.showSeconds ?? false;
  const showDate = clockConfig?.showDate ?? true;
  const format24h = clockConfig?.format24h ?? false;
  const rawAlignment = clockConfig?.alignment;
  const alignment =
    rawAlignment === 'left' || rawAlignment === 'center' || rawAlignment === 'right'
      ? rawAlignment
      : 'right';
  const rawVerticalAlignment = clockConfig?.verticalAlignment;
  const verticalAlignment =
    rawVerticalAlignment === 'top' ||
    rawVerticalAlignment === 'center' ||
    rawVerticalAlignment === 'bottom'
      ? rawVerticalAlignment
      : 'top';

  const DESIGN_W = 320;
  const DESIGN_H = 100;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  const alignmentStyles = {
    left: {
      containerClass: 'self-start items-start text-left',
      transformOriginX: 'left',
    },
    center: {
      containerClass: 'self-center items-center text-center',
      transformOriginX: 'center',
    },
    right: {
      containerClass: 'self-end items-end text-right',
      transformOriginX: 'right',
    },
  } as const;

  const verticalAlignmentStyles = {
    top: {
      containerClass: 'justify-start',
      transformOriginY: 'top',
    },
    center: {
      containerClass: 'justify-center',
      transformOriginY: 'center',
    },
    bottom: {
      containerClass: 'justify-end',
      transformOriginY: 'bottom',
    },
  } as const;

  const horizontalLayout = alignmentStyles[alignment];
  const verticalLayout = verticalAlignmentStyles[verticalAlignment];

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div
        ref={containerRef}
        className={`h-full flex flex-col p-4 ${verticalLayout.containerClass}`}
      >
        <div
          className={`h-12 w-32 rounded animate-pulse ${horizontalLayout.containerClass}`}
          style={{ backgroundColor: `${theme.accent}20` }}
        />
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
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden flex flex-col ${verticalLayout.containerClass}`}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: `${horizontalLayout.transformOriginX} ${verticalLayout.transformOriginY}`,
        }}
        className={`flex flex-col justify-center font-clock px-4 ${horizontalLayout.containerClass}`}
      >
        <div
          className="text-5xl font-bold tracking-tight tabular-nums"
          style={{ color: theme.accent }}
        >
          {time.toLocaleTimeString([], timeOptions)}
        </div>
        {showDate && (
          <div className="text-base opacity-80 mt-1 font-medium tracking-wide text-white/80">
            {time.toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
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
    alignment: 'right',
    verticalAlignment: 'top',
  },
});
