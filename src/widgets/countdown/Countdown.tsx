'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import CountdownOptions from './CountdownOptions';

type UnitVisibility = 'auto' | 'show' | 'hide';

export interface Milestone {
  label: string;
  date: string;      // "YYYY-MM-DD"
  time: string;      // "HH:MM"
  emoji?: string;
}

interface CountdownConfig {
  // Legacy single-event fields (still supported for backwards compat)
  targetDate?: string;
  targetTime?: string;
  eventName?: string;
  // New multi-milestone fields
  milestones?: Milestone[];
  rotationSeconds?: number;
  hideCompleted?: boolean;
  // Unit visibility
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

const EMPTY_REMAINING: TimeRemaining = {
  total: 0,
  years: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 0,
};

function computeRemaining(target: Date, now: number = Date.now()): TimeRemaining {
  const total = Math.max(0, target.getTime() - now);

  if (total <= 0) {
    return EMPTY_REMAINING;
  }

  let remainder = total;

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

function milestoneToTarget(m: Milestone): Date {
  const time = m.time?.trim() || '00:00';
  return new Date(`${m.date}T${time}:00`);
}

/** Migrate legacy single-event config to milestones array */
function getMilestones(cfg: CountdownConfig | undefined): Milestone[] {
  if (cfg?.milestones && cfg.milestones.length > 0) {
    return cfg.milestones;
  }
  // Legacy: convert single event fields to a milestone
  if (cfg?.targetDate?.trim()) {
    return [{
      label: cfg.eventName?.trim() || '',
      date: cfg.targetDate.trim(),
      time: cfg.targetTime?.trim() || '00:00',
    }];
  }
  // Default: next New Year
  const target = getDefaultTarget();
  const y = target.getFullYear();
  return [{ label: `New Year ${y}`, date: `${y}-01-01`, time: '00:00', emoji: '🎉' }];
}

export default function Countdown({ config, theme }: WidgetComponentProps) {
  const cfg = config as CountdownConfig | undefined;

  const showYears = cfg?.showYears ?? 'auto';
  const showDays = cfg?.showDays ?? 'auto';
  const showHours = cfg?.showHours ?? 'auto';
  const showMinutes = cfg?.showMinutes ?? 'auto';
  const showSeconds = cfg?.showSeconds ?? 'auto';
  const showMilliseconds = cfg?.showMilliseconds ?? 'hide';
  const hideCompleted = cfg?.hideCompleted ?? true;
  const rotationSeconds = Math.max(3, Math.min(60, cfg?.rotationSeconds ?? 8));

  const allMilestones = useMemo(() => getMilestones(cfg), [cfg]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Filter out completed milestones if requested
  const activeMilestones = useMemo(() => {
    if (!hideCompleted) return allMilestones;
    const active = allMilestones.filter(m => {
      const t = milestoneToTarget(m);
      return !isNaN(t.getTime()) && t.getTime() > nowMs;
    });
    // If all are completed, show the last one so the widget isn't empty
    return active.length > 0 ? active : allMilestones.slice(-1);
  }, [allMilestones, hideCompleted, nowMs]);

  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedActiveIndex =
    activeMilestones.length > 0 ? activeIndex % activeMilestones.length : 0;
  const currentMilestone = activeMilestones[normalizedActiveIndex];
  const target = useMemo(
    () => (currentMilestone ? milestoneToTarget(currentMilestone) : getDefaultTarget()),
    [currentMilestone]
  );
  const isValidTarget = !isNaN(target.getTime());
  const remaining = useMemo(
    () => (isValidTarget ? computeRemaining(target, nowMs) : EMPTY_REMAINING),
    [isValidTarget, nowMs, target]
  );
  const tick = useCallback(() => {
    setNowMs(Date.now());
  }, []);

  // Countdown tick
  useEffect(() => {
    if (!isValidTarget) return;

    const useRaf = showMilliseconds === 'show';

    if (useRaf) {
      const frame = () => {
        tick();
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } else {
      const needsMs = showMilliseconds === 'auto';
      const intervalMs = needsMs ? 100 : 1000;
      rafRef.current = requestAnimationFrame(tick);
      intervalRef.current = setInterval(tick, intervalMs);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isValidTarget, showMilliseconds, tick]);

  // Auto-rotation between milestones
  useEffect(() => {
    if (activeMilestones.length <= 1) return;
    rotationRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % activeMilestones.length);
    }, rotationSeconds * 1000);
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [activeMilestones.length, rotationSeconds]);

  // Landscape: wide banner for all units in a row; portrait: taller with wrapping units
  const { containerRef, scale, designWidth: BASE_W, designHeight: DESIGN_H, isLandscape, containerWidth } = useAdaptiveFitScale({
    landscape: { w: 500, h: 220 },
    portrait: { w: 280, h: 360 },
  });
  // Fill the full container width when stretched horizontally
  const DESIGN_W = containerWidth > 0 ? Math.max(BASE_W, containerWidth / scale) : BASE_W;

  const isFinished = remaining.total <= 0;

  // Determine which units to show
  const units: { key: string; value: number; label: string; padWidth: number }[] = [];
  const yearsVisible = shouldShowUnit(showYears, remaining.years, false);
  const daysVisible = shouldShowUnit(showDays, remaining.days, yearsVisible);
  const hoursVisible = shouldShowUnit(showHours, remaining.hours, yearsVisible || daysVisible);
  const minutesVisible = shouldShowUnit(showMinutes, remaining.minutes, yearsVisible || daysVisible || hoursVisible);
  const secondsVisible = shouldShowUnit(showSeconds, remaining.seconds, yearsVisible || daysVisible || hoursVisible || minutesVisible);
  const msVisible = shouldShowUnit(showMilliseconds, remaining.milliseconds, false);

  if (yearsVisible) units.push({ key: 'years', value: remaining.years, label: remaining.years === 1 ? 'Year' : 'Years', padWidth: 1 });
  if (daysVisible) units.push({ key: 'days', value: remaining.days, label: remaining.days === 1 ? 'Day' : 'Days', padWidth: remaining.days >= 100 ? 3 : remaining.days >= 10 ? 2 : 1 });
  if (hoursVisible) units.push({ key: 'hours', value: remaining.hours, label: remaining.hours === 1 ? 'Hour' : 'Hours', padWidth: 2 });
  if (minutesVisible) units.push({ key: 'minutes', value: remaining.minutes, label: remaining.minutes === 1 ? 'Min' : 'Mins', padWidth: 2 });
  if (secondsVisible) units.push({ key: 'seconds', value: remaining.seconds, label: remaining.seconds === 1 ? 'Sec' : 'Secs', padWidth: 2 });
  if (msVisible) units.push({ key: 'ms', value: remaining.milliseconds, label: 'MS', padWidth: 3 });

  const useCompactLayout =
    !isLandscape ||
    (containerWidth > 0 && units.length > 0 && containerWidth / units.length < 135);

  const eventLabel = currentMilestone?.label || '';
  const eventEmoji = currentMilestone?.emoji || '';

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
        {/* Event Name with optional emoji */}
        {(eventLabel || eventEmoji) && (
          <div
            className="text-sm font-semibold tracking-wide uppercase mb-4 transition-opacity duration-500"
            style={{ color: theme.accent }}
          >
            {eventEmoji && <span className="mr-1.5">{eventEmoji}</span>}
            {eventLabel}
            {eventEmoji && <span className="ml-1.5">{eventEmoji}</span>}
          </div>
        )}

        {!isValidTarget ? (
          <div className="text-white/50 text-lg">Set a target date in options</div>
        ) : isFinished ? (
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-2">
              {eventEmoji || '🎉'} Time&apos;s Up!
            </div>
            {eventLabel && (
              <div className="text-lg" style={{ color: theme.accent }}>
                {eventLabel} has arrived
              </div>
            )}
          </div>
        ) : (
          <div
            className={
              useCompactLayout
                ? 'flex w-fit max-w-[320px] flex-wrap items-center justify-center gap-x-3 gap-y-3'
                : 'flex items-center justify-center gap-1'
            }
          >
            {units.map((unit, i) => (
              <div key={unit.key} className="flex items-center">
                {!useCompactLayout && i > 0 && unit.key !== 'ms' && <Separator />}
                {!useCompactLayout && i > 0 && unit.key === 'ms' && (
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
          <div className="text-xs text-white/30 text-center mt-3">
            {target.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {(currentMilestone?.time || '00:00') !== '00:00' && ` at ${currentMilestone?.time}`}
          </div>
        )}

        {/* Dot indicators for multiple milestones */}
        {activeMilestones.length > 1 && (
          <div className="flex gap-1.5 mt-3">
            {activeMilestones.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === normalizedActiveIndex ? 20 : 8,
                  backgroundColor: i === normalizedActiveIndex ? theme.accent : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'countdown',
  name: 'Countdown',
  description: 'Countdown timer with multiple milestones, auto-rotation, and dot indicators',
  icon: 'hourglass',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 2,
  component: Countdown,
  OptionsComponent: CountdownOptions,
  defaultProps: {
    milestones: [],
    rotationSeconds: 8,
    hideCompleted: true,
    showYears: 'auto',
    showDays: 'auto',
    showHours: 'auto',
    showMinutes: 'auto',
    showSeconds: 'auto',
    showMilliseconds: 'hide',
  },
});
