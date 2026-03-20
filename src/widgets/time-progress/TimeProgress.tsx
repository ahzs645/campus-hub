'use client';

import { useState, useEffect, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import TimeProgressOptions from './TimeProgressOptions';

interface TimeProgressConfig {
  displayMode?: 'dots' | 'bars';
  showLabels?: boolean;
}

interface ProgressRow {
  label: string;
  progress: number; // 0-1
}

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

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

function calculateProgress(now: Date): ProgressRow[] {
  const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const dayProgress = hours / 24;

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const weekProgress = (dayOfWeek - 1 + hours / 24) / 7;

  const dayOfMonth = now.getDate();
  const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
  const monthProgress = (dayOfMonth - 1 + hours / 24) / daysInMonth;

  const dayOfYear = getDayOfYear(now);
  const daysInYear = getDaysInYear(now.getFullYear());
  const yearProgress = (dayOfYear - 1 + hours / 24) / daysInYear;

  return [
    { label: DAYS[now.getDay()], progress: Math.min(1, Math.max(0, dayProgress)) },
    { label: `WEEK ${getISOWeekNumber(now)}`, progress: Math.min(1, Math.max(0, weekProgress)) },
    { label: MONTHS[now.getMonth()], progress: Math.min(1, Math.max(0, monthProgress)) },
    { label: `${now.getFullYear()}`, progress: Math.min(1, Math.max(0, yearProgress)) },
  ];
}

const DOT_COUNT = 40;
const DOTS_PER_ROW = 20;
const DANGER_THRESHOLD = 36; // index >= 36 gets red when filled

const COLOR_BG = '#1B1B1D';
const COLOR_PRIMARY = '#FDFBFF';
const COLOR_UNFILLED = '#5E5E62';
const COLOR_DANGER = '#D81921';

function FiniteDotGrid({ progress }: { progress: number }) {
  const filledCount = Math.round(progress * DOT_COUNT);

  return (
    <div className="flex-1 flex flex-col gap-[2px] mx-[8px] justify-center">
      {[0, 1].map((row) => (
        <div key={row} className="flex gap-[2px]">
          {Array.from({ length: DOTS_PER_ROW }, (_, col) => {
            const idx = row * DOTS_PER_ROW + col;
            const isFilled = idx < filledCount;
            let color: string;
            if (isFilled) {
              color = idx >= DANGER_THRESHOLD ? COLOR_DANGER : COLOR_PRIMARY;
            } else {
              color = COLOR_UNFILLED;
            }
            return (
              <div
                key={idx}
                className="w-[4px] h-[4px] rounded-sm"
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FiniteDotsRow({ item }: { item: ProgressRow }) {
  const pct = Math.round(item.progress * 100);

  return (
    <div className="flex items-center flex-1 w-full">
      <span
        className="font-mono uppercase tracking-wider text-[16px] leading-none shrink-0"
        style={{ color: COLOR_PRIMARY, width: '30%' }}
      >
        {item.label}
      </span>
      <FiniteDotGrid progress={item.progress} />
      <span
        className="font-mono uppercase tracking-wider text-[16px] leading-none text-right shrink-0"
        style={{ color: COLOR_PRIMARY, width: '15%' }}
      >
        {pct}%
      </span>
    </div>
  );
}

function BarsRow({ item }: { item: ProgressRow }) {
  const pct = Math.round(item.progress * 100);

  return (
    <div className="flex items-center gap-2 flex-1 w-full">
      <span
        className="font-mono uppercase tracking-wider text-[16px] leading-none shrink-0"
        style={{ color: COLOR_PRIMARY, width: '30%' }}
      >
        {item.label}
      </span>
      <div
        className="flex-1 h-[8px] rounded-full overflow-hidden mx-[8px]"
        style={{ backgroundColor: COLOR_UNFILLED }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 90 ? COLOR_DANGER : COLOR_PRIMARY,
          }}
        />
      </div>
      <span
        className="font-mono uppercase tracking-wider text-[16px] leading-none text-right shrink-0"
        style={{ color: COLOR_PRIMARY, width: '15%' }}
      >
        {pct}%
      </span>
    </div>
  );
}

export default function TimeProgress({ config }: WidgetComponentProps) {
  const cfg = config as TimeProgressConfig | undefined;
  const displayMode = cfg?.displayMode ?? 'dots';

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const items = useMemo(() => calculateProgress(now), [now]);

  const { containerRef, scale } = useFitScale(400, 140);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{
        backgroundColor: COLOR_BG,
        borderRadius: 22,
      }}
    >
      <div
        style={{
          width: 400,
          height: 140,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          paddingTop: 14.4,
          paddingBottom: 14.4,
          paddingLeft: 18,
          paddingRight: 18,
        }}
        className="flex flex-col gap-[6px]"
      >
        {items.map((item) =>
          displayMode === 'dots' ? (
            <FiniteDotsRow key={item.label} item={item} />
          ) : (
            <BarsRow key={item.label} item={item} />
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
