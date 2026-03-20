'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import F1CountdownOptions from './F1CountdownOptions';

interface F1CountdownConfig {
  showSessions?: boolean;
}

interface Race {
  raceName: string;
  Circuit: {
    circuitName: string;
    Location: {
      country: string;
      locality: string;
    };
  };
  date: string;
  time?: string;
  FirstPractice?: { date: string; time?: string };
  SecondPractice?: { date: string; time?: string };
  ThirdPractice?: { date: string; time?: string };
  Qualifying?: { date: string; time?: string };
  Sprint?: { date: string; time?: string };
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const FLAG_EMOJI: Record<string, string> = {
  'Australia': '\u{1F1E6}\u{1F1FA}',
  'Bahrain': '\u{1F1E7}\u{1F1ED}',
  'Saudi Arabia': '\u{1F1F8}\u{1F1E6}',
  'Japan': '\u{1F1EF}\u{1F1F5}',
  'China': '\u{1F1E8}\u{1F1F3}',
  'USA': '\u{1F1FA}\u{1F1F8}',
  'Italy': '\u{1F1EE}\u{1F1F9}',
  'Monaco': '\u{1F1F2}\u{1F1E8}',
  'Canada': '\u{1F1E8}\u{1F1E6}',
  'Spain': '\u{1F1EA}\u{1F1F8}',
  'Austria': '\u{1F1E6}\u{1F1F9}',
  'UK': '\u{1F1EC}\u{1F1E7}',
  'Hungary': '\u{1F1ED}\u{1F1FA}',
  'Belgium': '\u{1F1E7}\u{1F1EA}',
  'Netherlands': '\u{1F1F3}\u{1F1F1}',
  'Singapore': '\u{1F1F8}\u{1F1EC}',
  'Mexico': '\u{1F1F2}\u{1F1FD}',
  'Brazil': '\u{1F1E7}\u{1F1F7}',
  'Qatar': '\u{1F1F6}\u{1F1E6}',
  'UAE': '\u{1F1E6}\u{1F1EA}',
  'Azerbaijan': '\u{1F1E6}\u{1F1FF}',
  'United States': '\u{1F1FA}\u{1F1F8}',
};

function computeRemaining(target: Date): TimeRemaining {
  const total = Math.max(0, target.getTime() - Date.now());
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

  const days = Math.floor(total / (24 * 60 * 60 * 1000));
  const hours = Math.floor((total % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((total % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((total % (60 * 1000)) / 1000);

  return { days, hours, minutes, seconds, total };
}

function parseRaceDate(date: string, time?: string): Date {
  if (time) return new Date(`${date}T${time}`);
  return new Date(`${date}T14:00:00Z`);
}

function formatSessionDate(date: string, time?: string): string {
  const d = parseRaceDate(date, time);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function F1Countdown({ config, theme }: WidgetComponentProps) {
  const cfg = config as F1CountdownConfig | undefined;
  const showSessions = cfg?.showSessions ?? true;

  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [remaining, setRemaining] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const DESIGN_W = 300;
  const DESIGN_H = 180;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  const fetchSchedule = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('https://api.jolpi.ca/ergast/f1/current.json');
      if (!res.ok) throw new Error('Failed to fetch F1 schedule');
      const json = await res.json();
      const races: Race[] = json?.MRData?.RaceTable?.Races ?? [];
      const now = new Date();
      const upcoming = races.find((r) => parseRaceDate(r.date, r.time) > now);
      setNextRace(upcoming ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Fetch on mount and every hour
  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  // Update countdown every second
  useEffect(() => {
    if (!nextRace) return;
    const target = parseRaceDate(nextRace.date, nextRace.time);
    const tick = () => setRemaining(computeRemaining(target));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  const country = nextRace?.Circuit?.Location?.country ?? '';
  const flag = FLAG_EMOJI[country] ?? '';

  const sessions: { label: string; date: string; time?: string }[] = [];
  if (nextRace && showSessions) {
    if (nextRace.FirstPractice) sessions.push({ label: 'FP1', ...nextRace.FirstPractice });
    if (nextRace.Qualifying) sessions.push({ label: 'Qualifying', ...nextRace.Qualifying });
    if (nextRace.Sprint) sessions.push({ label: 'Sprint', ...nextRace.Sprint });
    sessions.push({ label: 'Race', date: nextRace.date, time: nextRace.time });
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: '#111' }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col justify-center px-5 py-3"
      >
        {error && (
          <div className="text-red-400 text-xs text-center">{error}</div>
        )}

        {!nextRace && !error && (
          <div className="text-white/50 text-sm text-center">Loading F1 schedule...</div>
        )}

        {nextRace && (
          <>
            {/* Race name & circuit */}
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-medium mb-0.5">
                Next Race
              </div>
              <div className="text-sm font-semibold text-white leading-tight truncate">
                {flag && <span className="mr-1">{flag}</span>}
                {nextRace.raceName}
              </div>
              <div className="text-[10px] text-white/50 truncate">
                {nextRace.Circuit.circuitName}
              </div>
            </div>

            {/* Countdown */}
            <div className="flex items-baseline gap-1.5 mb-2">
              <span
                className="text-3xl font-bold font-mono tabular-nums leading-none"
                style={{ color: theme.accent }}
              >
                {remaining.days}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/50 mr-2">
                {remaining.days === 1 ? 'day' : 'days'}
              </span>
              <span
                className="text-lg font-bold font-mono tabular-nums leading-none"
                style={{ color: theme.accent }}
              >
                {String(remaining.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-white/40">h</span>
              <span
                className="text-lg font-bold font-mono tabular-nums leading-none"
                style={{ color: theme.accent }}
              >
                {String(remaining.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-white/40">m</span>
              <span
                className="text-lg font-bold font-mono tabular-nums leading-none"
                style={{ color: theme.accent }}
              >
                {String(remaining.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-white/40">s</span>
            </div>

            {/* Sessions */}
            {showSessions && sessions.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {sessions.map((s) => (
                  <div key={s.label} className="text-[9px] text-white/40">
                    <span className="font-medium text-white/60">{s.label}</span>{' '}
                    {formatSessionDate(s.date, s.time)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'f1-countdown',
  name: 'F1 Countdown',
  description: 'Countdown to next F1 race',
  icon: 'flag',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: F1Countdown,
  OptionsComponent: F1CountdownOptions,
  defaultProps: { showSessions: true },
});
