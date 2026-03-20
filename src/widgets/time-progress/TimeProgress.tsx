'use client';

import { useState, useEffect, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import TimeProgressOptions from './TimeProgressOptions';

interface TimeProgressConfig {
  displayMode?: 'dots' | 'bars';
  showLabels?: boolean;
}

interface ProgressItem {
  label: string;
  progress: number; // 0-1
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function calculateProgress(now: Date): ProgressItem[] {
  const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const dayProgress = hours / 24;

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // ISO: Mon=1, Sun=7
  const weekProgress = (dayOfWeek - 1 + hours / 24) / 7;

  const dayOfMonth = now.getDate();
  const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
  const monthProgress = (dayOfMonth - 1 + hours / 24) / daysInMonth;

  const dayOfYear = getDayOfYear(now);
  const daysInYear = getDaysInYear(now.getFullYear());
  const yearProgress = (dayOfYear - 1 + hours / 24) / daysInYear;

  return [
    { label: 'DAY', progress: Math.min(1, Math.max(0, dayProgress)) },
    { label: 'WEEK', progress: Math.min(1, Math.max(0, weekProgress)) },
    { label: 'MONTH', progress: Math.min(1, Math.max(0, monthProgress)) },
    { label: 'YEAR', progress: Math.min(1, Math.max(0, yearProgress)) },
  ];
}

const DOT_COUNT = 20;

function DotsRow({
  item,
  accent,
  primary,
  showLabel,
}: {
  item: ProgressItem;
  accent: string;
  primary: string;
  showLabel: boolean;
}) {
  const filledCount = Math.round(item.progress * DOT_COUNT);
  const pct = Math.round(item.progress * 100);

  return (
    <div className="flex items-center gap-2 w-full">
      {showLabel && (
        <span
          className="text-[10px] font-bold tracking-widest w-[42px] shrink-0"
          style={{ color: accent }}
        >
          {item.label}
        </span>
      )}
      <div className="flex gap-[3px] flex-1 items-center">
        {Array.from({ length: DOT_COUNT }, (_, i) => {
          const isFilled = i < filledCount;
          const isLast = isFilled && i === filledCount - 1;
          return (
            <div
              key={i}
              className="w-[6px] h-[6px] rounded-full transition-colors duration-300"
              style={{
                backgroundColor: isFilled
                  ? isLast
                    ? primary
                    : accent
                  : `${accent}26`, // 15% opacity
              }}
            />
          );
        })}
      </div>
      <span
        className="text-[10px] font-mono tabular-nums w-[30px] text-right shrink-0"
        style={{ color: accent }}
      >
        {pct}%
      </span>
    </div>
  );
}

function BarsRow({
  item,
  accent,
  showLabel,
}: {
  item: ProgressItem;
  accent: string;
  showLabel: boolean;
}) {
  const pct = Math.round(item.progress * 100);

  return (
    <div className="flex items-center gap-2 w-full">
      {showLabel && (
        <span
          className="text-[10px] font-bold tracking-widest w-[42px] shrink-0"
          style={{ color: accent }}
        >
          {item.label}
        </span>
      )}
      <div
        className="flex-1 h-[8px] rounded-full overflow-hidden"
        style={{ backgroundColor: `${accent}26` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: accent,
          }}
        />
      </div>
      <span
        className="text-[10px] font-mono tabular-nums w-[30px] text-right shrink-0"
        style={{ color: accent }}
      >
        {pct}%
      </span>
    </div>
  );
}

export default function TimeProgress({ config, theme }: WidgetComponentProps) {
  const cfg = config as TimeProgressConfig | undefined;
  const displayMode = cfg?.displayMode ?? 'dots';
  const showLabels = cfg?.showLabels ?? true;

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const items = useMemo(() => calculateProgress(now), [now]);

  const { containerRef, scale } = useFitScale(300, 160);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: 300,
          height: 160,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col justify-center gap-3 px-4 py-3"
      >
        {items.map((item) =>
          displayMode === 'dots' ? (
            <DotsRow
              key={item.label}
              item={item}
              accent={theme.accent}
              primary={theme.primary}
              showLabel={showLabels}
            />
          ) : (
            <BarsRow
              key={item.label}
              item={item}
              accent={theme.accent}
              showLabel={showLabels}
            />
          )
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'time-progress',
  name: 'Time Progress',
  description: 'Day, week, month & year progress',
  icon: 'hourglass',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: TimeProgress,
  OptionsComponent: TimeProgressOptions,
  defaultProps: { displayMode: 'dots', showLabels: true },
});
