'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import CountdownOptions from './CountdownOptions';

type UnitVisibility = 'auto' | 'show' | 'hide';

interface CountdownConfig {
  targetDate?: string;    // ISO date string or "YYYY-MM-DD"
  targetTime?: string;    // "HH:MM" 24h format
  eventName?: string;
  showYears?: UnitVisibility;
  showDays?: UnitVisibility;
  showHours?: UnitVisibility;
  showMinutes?: UnitVisibility;
  showSeconds?: UnitVisibility;
  showMilliseconds?: UnitVisibility;
}

interface TimeRemaining {
  total: number;
  years: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

function computeRemaining(target: Date): TimeRemaining {
  const now = Date.now();
  const total = Math.max(0, target.getTime() - now);

  if (total <= 0) {
    return { total: 0, years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
  }

  let remainder = total;

  // Calculate years as 365.25 days
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const years = Math.floor(remainder / msPerYear);
  remainder -= years * msPerYear;

  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.floor(remainder / msPerDay);
  remainder -= days * msPerDay;

  const hours = Math.floor(remainder / (60 * 60 * 1000));
  remainder -= hours * 60 * 60 * 1000;

  const minutes = Math.floor(remainder / (60 * 1000));
  remainder -= minutes * 60 * 1000;

  const seconds = Math.floor(remainder / 1000);
  const milliseconds = Math.floor(remainder % 1000);

  return { total, years, days, hours, minutes, seconds, milliseconds };
}

function shouldShowUnit(visibility: UnitVisibility, value: number, hasLargerUnit: boolean): boolean {
  if (visibility === 'show') return true;
  if (visibility === 'hide') return false;
  // Auto: show if value > 0, or if a larger unit is shown (to avoid gaps)
  return value > 0 || hasLargerUnit;
}

interface UnitDisplayProps {
  value: number;
  label: string;
  padWidth: number;
  accent: string;
}

function UnitDisplay({ value, label, padWidth, accent }: UnitDisplayProps) {
  const display = String(value).padStart(padWidth, '0');
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-4xl font-bold font-mono tabular-nums leading-none px-2 py-1.5 rounded-lg"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      >
        {display}
      </div>
      <div className="text-xs uppercase tracking-wider mt-1.5 font-medium" style={{ color: accent }}>
        {label}
      </div>
    </div>
  );
}

function Separator() {
  return (
    <div className="text-3xl font-bold text-white/30 self-start mt-1 mx-0.5">:</div>
  );
}

// Default: count down to next New Year
function getDefaultTarget(): Date {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(`${year}-01-01T00:00:00`);
}

export default function Countdown({ config, theme }: WidgetComponentProps) {
  const cfg = config as CountdownConfig | undefined;

  const eventName = cfg?.eventName?.trim() || '';
  const showYears = cfg?.showYears ?? 'auto';
  const showDays = cfg?.showDays ?? 'auto';
  const showHours = cfg?.showHours ?? 'auto';
  const showMinutes = cfg?.showMinutes ?? 'auto';
  const showSeconds = cfg?.showSeconds ?? 'auto';
  const showMilliseconds = cfg?.showMilliseconds ?? 'hide';

  // Build target date
  const targetDate = cfg?.targetDate?.trim();
  const targetTime = cfg?.targetTime?.trim() || '00:00';
  const target = targetDate
    ? new Date(`${targetDate}T${targetTime}:00`)
    : getDefaultTarget();

  const isValidTarget = !isNaN(target.getTime());

  const [remaining, setRemaining] = useState<TimeRemaining>(() =>
    isValidTarget ? computeRemaining(target) : { total: 0, years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }
  );
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const update = useCallback(() => {
    if (isValidTarget) {
      setRemaining(computeRemaining(target));
    }
  }, [isValidTarget, target]);

  useEffect(() => {
    if (!isValidTarget) return;

    const needsMs = showMilliseconds === 'show' || (showMilliseconds === 'auto');
    const useRaf = showMilliseconds === 'show';

    if (useRaf) {
      // Use requestAnimationFrame for ms precision
      const tick = () => {
        update();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } else {
      // Use setInterval at 1s for normal countdown, 100ms if auto-ms might appear
      const intervalMs = needsMs ? 100 : 1000;
      update();
      intervalRef.current = setInterval(update, intervalMs);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isValidTarget, showMilliseconds, update]);

  const DESIGN_W = 500;
  const DESIGN_H = 200;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  const isFinished = remaining.total <= 0;

  // Determine which units to show
  const units: { key: string; value: number; label: string; padWidth: number }[] = [];

  // Build visibility chain — "auto" checks if value > 0 OR a larger visible unit exists
  const yearsVisible = shouldShowUnit(showYears, remaining.years, false);
  const daysVisible = shouldShowUnit(showDays, remaining.days, yearsVisible);
  const hoursVisible = shouldShowUnit(showHours, remaining.hours, yearsVisible || daysVisible);
  const minutesVisible = shouldShowUnit(showMinutes, remaining.minutes, yearsVisible || daysVisible || hoursVisible);
  const secondsVisible = shouldShowUnit(showSeconds, remaining.seconds, yearsVisible || daysVisible || hoursVisible || minutesVisible);
  const msVisible = shouldShowUnit(showMilliseconds, remaining.milliseconds, false);

  if (yearsVisible) units.push({ key: 'years', value: remaining.years, label: remaining.years === 1 ? 'Year' : 'Years', padWidth: 1 });
  if (daysVisible) units.push({ key: 'days', value: remaining.days, label: remaining.days === 1 ? 'Day' : 'Days', padWidth: yearsVisible ? 3 : 1 });
  if (hoursVisible) units.push({ key: 'hours', value: remaining.hours, label: remaining.hours === 1 ? 'Hour' : 'Hours', padWidth: 2 });
  if (minutesVisible) units.push({ key: 'minutes', value: remaining.minutes, label: remaining.minutes === 1 ? 'Min' : 'Mins', padWidth: 2 });
  if (secondsVisible) units.push({ key: 'seconds', value: remaining.seconds, label: remaining.seconds === 1 ? 'Sec' : 'Secs', padWidth: 2 });
  if (msVisible) units.push({ key: 'ms', value: remaining.milliseconds, label: 'MS', padWidth: 3 });

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col items-center justify-center p-6"
      >
        {/* Event Name */}
        {eventName && (
          <div
            className="text-sm font-semibold tracking-wide uppercase mb-4"
            style={{ color: theme.accent }}
          >
            {eventName}
          </div>
        )}

        {!isValidTarget ? (
          <div className="text-white/50 text-lg">Set a target date in options</div>
        ) : isFinished ? (
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              Time&apos;s Up!
            </div>
            {eventName && (
              <div className="text-lg" style={{ color: theme.accent }}>
                {eventName} has arrived
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {units.map((unit, i) => (
              <div key={unit.key} className="flex items-center">
                {i > 0 && unit.key !== 'ms' && <Separator />}
                {i > 0 && unit.key === 'ms' && (
                  <div className="text-3xl font-bold text-white/30 self-start mt-1 mx-0.5">.</div>
                )}
                <UnitDisplay
                  value={unit.value}
                  label={unit.label}
                  padWidth={unit.padWidth}
                  accent={theme.accent}
                />
              </div>
            ))}
          </div>
        )}

        {/* Target date display */}
        {isValidTarget && !isFinished && (
          <div className="text-xs text-white/30 mt-4">
            {target.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {targetTime !== '00:00' && ` at ${targetTime}`}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'countdown',
  name: 'Countdown',
  description: 'Countdown timer to a specific date and time',
  icon: 'hourglass',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 2,
  component: Countdown,
  OptionsComponent: CountdownOptions,
  defaultProps: {
    targetDate: '',
    targetTime: '00:00',
    eventName: '',
    showYears: 'auto',
    showDays: 'auto',
    showHours: 'auto',
    showMinutes: 'auto',
    showSeconds: 'auto',
    showMilliseconds: 'hide',
  },
});
