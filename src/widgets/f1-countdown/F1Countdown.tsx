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

export default function F1Countdown({ config }: WidgetComponentProps) {
  const cfg = config as F1CountdownConfig | undefined;
  const showSessions = cfg?.showSessions ?? true;

  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [remaining, setRemaining] = useState<TimeRemaining>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const DESIGN_W = 340;
  const DESIGN_H = 200;
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

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  useEffect(() => {
    if (!nextRace) return;
    const target = parseRaceDate(nextRace.date, nextRace.time);
    const tick = () => setRemaining(computeRemaining(target));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  const country = nextRace?.Circuit?.Location?.country ?? '';
  const locality = nextRace?.Circuit?.Location?.locality ?? '';
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
      style={{ backgroundColor: '#1B1B1D' }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          padding: 16,
          borderRadius: 22,
        }}
        className="flex items-end"
      >
        {error && (
          <div style={{ color: '#ABABAF', fontSize: 11, textAlign: 'center', width: '100%' }}>{error}</div>
        )}

        {!nextRace && !error && (
          <div style={{ color: '#5E5E62', fontSize: 12, textAlign: 'center', width: '100%' }}>Loading F1 schedule...</div>
        )}

        {nextRace && (
          <>
            {/* Left column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Header: flag + race name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {flag && <span style={{ fontSize: 32, lineHeight: 1 }}>{flag}</span>}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#FDFBFF',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nextRace.raceName}
                </span>
              </div>

              {/* Location */}
              <div style={{ fontSize: 11, color: '#ABABAF', marginBottom: 4 }}>
                {locality}{country ? `, ${country}` : ''}
              </div>

              {/* Large countdown number */}
              <div>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 80,
                    lineHeight: '80px',
                    fontWeight: 400,
                    color: '#FDFBFF',
                    letterSpacing: '-2px',
                  }}
                >
                  {String(remaining.days).padStart(2, '0')}
                </span>
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: 11,
                  color: '#ABABAF',
                  fontWeight: 500,
                  letterSpacing: '1.1px',
                  textTransform: 'uppercase',
                }}
              >
                DAYS UNTIL RACE
              </div>
            </div>

            {/* Right column - Sessions */}
            {showSessions && sessions.length > 0 && (
              <div style={{ width: 120, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#ABABAF',
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  Sessions
                </div>
                {sessions.map((s) => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 11, color: '#FDFBFF', fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: '#ABABAF' }}>{formatSessionDate(s.date, s.time)}</span>
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
