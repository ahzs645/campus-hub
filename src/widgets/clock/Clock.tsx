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
  style?: 'digital' | 'analog';
}

function AnalogClock({ time, theme, showSeconds }: { time: Date; theme: { primary: string; accent: string }; showSeconds: boolean }) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Outer ring */}
      <circle cx="100" cy="100" r="95" fill="none" stroke={`${theme.accent}30`} strokeWidth="2" />
      <circle cx="100" cy="100" r="90" fill="none" stroke={`${theme.accent}15`} strokeWidth="1" />

      {/* Hour markers */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const isQuarter = i % 3 === 0;
        const outerR = 88;
        const innerR = isQuarter ? 75 : 80;
        return (
          <line
            key={i}
            x1={100 + Math.cos(angle) * innerR}
            y1={100 + Math.sin(angle) * innerR}
            x2={100 + Math.cos(angle) * outerR}
            y2={100 + Math.sin(angle) * outerR}
            stroke={theme.accent}
            strokeWidth={isQuarter ? 3 : 1.5}
            strokeLinecap="round"
            opacity={isQuarter ? 1 : 0.6}
          />
        );
      })}

      {/* Minute tick marks */}
      {Array.from({ length: 60 }).map((_, i) => {
        if (i % 5 === 0) return null;
        const angle = (i * 6 - 90) * (Math.PI / 180);
        return (
          <circle
            key={`m-${i}`}
            cx={100 + Math.cos(angle) * 85}
            cy={100 + Math.sin(angle) * 85}
            r="0.8"
            fill={theme.accent}
            opacity="0.3"
          />
        );
      })}

      {/* Hour hand */}
      <line
        x1="100"
        y1="100"
        x2={100 + Math.cos((hourAngle - 90) * (Math.PI / 180)) * 50}
        y2={100 + Math.sin((hourAngle - 90) * (Math.PI / 180)) * 50}
        stroke={theme.accent}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Minute hand */}
      <line
        x1="100"
        y1="100"
        x2={100 + Math.cos((minuteAngle - 90) * (Math.PI / 180)) * 70}
        y2={100 + Math.sin((minuteAngle - 90) * (Math.PI / 180)) * 70}
        stroke={theme.accent}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Second hand */}
      {showSeconds && (
        <>
          <line
            x1={100 - Math.cos((secondAngle - 90) * (Math.PI / 180)) * 15}
            y1={100 - Math.sin((secondAngle - 90) * (Math.PI / 180)) * 15}
            x2={100 + Math.cos((secondAngle - 90) * (Math.PI / 180)) * 78}
            y2={100 + Math.sin((secondAngle - 90) * (Math.PI / 180)) * 78}
            stroke={theme.primary}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="3" fill={theme.primary} />
        </>
      )}

      {/* Center dot */}
      <circle cx="100" cy="100" r={showSeconds ? 2 : 4} fill={theme.accent} />
    </svg>
  );
}

export default function Clock({ config, theme }: WidgetComponentProps) {
  const [time, setTime] = useState<Date | null>(null);
  const clockConfig = config as ClockConfig | undefined;
  const showSeconds = clockConfig?.showSeconds ?? false;
  const showDate = clockConfig?.showDate ?? true;
  const format24h = clockConfig?.format24h ?? false;
  const clockStyle = clockConfig?.style ?? 'digital';
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

  const isAnalog = clockStyle === 'analog';

  const DESIGN_W = isAnalog ? 240 : 320;
  const DESIGN_H = isAnalog ? 260 : 100;
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

  if (isAnalog) {
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
          className={`flex flex-col items-center justify-center ${horizontalLayout.containerClass}`}
        >
          <div className="w-[200px] h-[200px]">
            <AnalogClock time={time} theme={theme} showSeconds={showSeconds} />
          </div>
          {showDate && (
            <div className="text-sm opacity-80 mt-1 font-medium tracking-wide text-white/80 text-center">
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
  icon: 'clock',
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
    style: 'digital',
  },
});
