'use client';

import { useState, useEffect, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import CountdownTimerOptions from './CountdownTimerOptions';

interface Milestone {
  label: string;
  date: string; // ISO date string, e.g. "2026-05-15"
  emoji?: string;
}

interface CountdownTimerConfig {
  milestones?: Milestone[];
  rotationInterval?: number; // seconds between auto-rotation
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  hideCompleted?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeRemaining(targetDate: string): TimeRemaining {
  const target = new Date(targetDate + 'T23:59:59').getTime();
  const now = Date.now();
  const total = Math.max(0, target - now);

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

function TimeUnit({ value, label, theme }: { value: number; label: string; theme: { accent: string } }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="text-5xl font-bold tabular-nums leading-none"
        style={{ color: theme.accent }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-xs uppercase tracking-widest mt-1 text-white/60">
        {label}
      </div>
    </div>
  );
}

function Separator({ theme }: { theme: { accent: string } }) {
  return (
    <div
      className="text-3xl font-bold leading-none self-start mt-1 opacity-40"
      style={{ color: theme.accent }}
    >
      :
    </div>
  );
}

export default function CountdownTimer({ config, theme }: WidgetComponentProps) {
  const cfg = config as CountdownTimerConfig | undefined;

  const milestones = useMemo(() => cfg?.milestones ?? [], [cfg?.milestones]);
  const rotationInterval = cfg?.rotationInterval ?? 10;
  const showDays = cfg?.showDays ?? true;
  const showHours = cfg?.showHours ?? true;
  const showMinutes = cfg?.showMinutes ?? true;
  const showSeconds = cfg?.showSeconds ?? true;
  const hideCompleted = cfg?.hideCompleted ?? true;

  const [tick, setTick] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const DESIGN_W = 420;
  const DESIGN_H = 160;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  // Tick every second
  useEffect(() => {
    const update = () => setTick(Date.now());
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter milestones
  const activeMilestones = useMemo(() => {
    if (!tick) return milestones;
    if (!hideCompleted) return milestones;
    return milestones.filter((m) => getTimeRemaining(m.date).total > 0);
  }, [milestones, hideCompleted, tick]);

  // Auto-rotate through milestones
  useEffect(() => {
    if (activeMilestones.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % activeMilestones.length);
    }, rotationInterval * 1000);
    return () => clearInterval(timer);
  }, [activeMilestones.length, rotationInterval]);

  // Clamp active index
  const currentIndex = activeMilestones.length > 0 ? activeIndex % activeMilestones.length : 0;
  const currentMilestone = activeMilestones[currentIndex];

  if (!tick) {
    return (
      <div
        ref={containerRef}
        className="h-full flex items-center justify-center p-4"
      >
        <div
          className="h-12 w-48 rounded animate-pulse"
          style={{ backgroundColor: `${theme.accent}20` }}
        />
      </div>
    );
  }

  if (!currentMilestone) {
    return (
      <div
        ref={containerRef}
        className="h-full flex items-center justify-center p-4"
      >
        <div
          className="text-center"
          style={{
            width: DESIGN_W,
            height: DESIGN_H,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <div className="text-lg text-white/50">
            {milestones.length === 0
              ? 'No milestones configured'
              : 'All milestones have passed'}
          </div>
        </div>
      </div>
    );
  }

  const remaining = getTimeRemaining(currentMilestone.date);
  const isPast = remaining.total === 0;

  const units: { value: number; label: string }[] = [];
  if (showDays) units.push({ value: remaining.days, label: remaining.days === 1 ? 'Day' : 'Days' });
  if (showHours) units.push({ value: remaining.hours, label: remaining.hours === 1 ? 'Hour' : 'Hours' });
  if (showMinutes) units.push({ value: remaining.minutes, label: remaining.minutes === 1 ? 'Min' : 'Mins' });
  if (showSeconds) units.push({ value: remaining.seconds, label: remaining.seconds === 1 ? 'Sec' : 'Secs' });

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="flex flex-col items-center justify-center px-4"
      >
        {/* Milestone label */}
        <div className="text-base font-semibold tracking-wide text-white/80 mb-3 text-center truncate w-full">
          {currentMilestone.emoji && (
            <span className="mr-2">{currentMilestone.emoji}</span>
          )}
          {currentMilestone.label}
        </div>

        {/* Countdown units */}
        {isPast ? (
          <div
            className="text-2xl font-bold"
            style={{ color: theme.accent }}
          >
            Event has arrived!
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {units.map((unit, i) => (
              <div key={unit.label} className="flex items-center gap-3">
                {i > 0 && <Separator theme={theme} />}
                <TimeUnit value={unit.value} label={unit.label} theme={theme} />
              </div>
            ))}
          </div>
        )}

        {/* Dots indicator for multiple milestones */}
        {activeMilestones.length > 1 && (
          <div className="flex gap-1.5 mt-3">
            {activeMilestones.map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-opacity duration-300"
                style={{
                  backgroundColor: theme.accent,
                  opacity: i === currentIndex ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'countdown-timer',
  name: 'Countdown Timer',
  description: 'Countdown to upcoming milestones like finals, holidays, and graduation',
  icon: 'timer',
  minW: 3,
  minH: 1,
  defaultW: 4,
  defaultH: 2,
  component: CountdownTimer,
  OptionsComponent: CountdownTimerOptions,
  defaultProps: {
    milestones: [
      { label: 'Finals Week', date: '2026-05-11', emoji: '📝' },
      { label: 'Summer Break', date: '2026-06-15', emoji: '☀️' },
      { label: 'Graduation', date: '2026-06-20', emoji: '🎓' },
    ],
    rotationInterval: 10,
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
    hideCompleted: true,
  },
});
