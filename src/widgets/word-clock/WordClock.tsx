'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import WordClockOptions from './WordClockOptions';

interface WordClockConfig {
  language?: 'en';
  accentMinutes?: boolean;
}

// The word clock grid — each row is a string of characters
// Active words light up based on the current time
const GRID = [
  'ITLISASAMPM',
  'ACQUARTERDC',
  'TWENTYFIVEX',
  'HALFBTENFTO',
  'PASTERUNINE',
  'ONESIXTHREE',
  'FOURFIVETWO',
  'EIGHTELEVEN',
  'SEVENTWELVE',
  'TENSEOCLOCK',
];

interface WordMatch {
  row: number;
  start: number;
  end: number; // exclusive
}

function getTimeWords(hours: number, minutes: number): WordMatch[] {
  const matches: WordMatch[] = [];

  // "IT IS" always on
  matches.push({ row: 0, start: 0, end: 2 }); // IT
  matches.push({ row: 0, start: 3, end: 5 }); // IS

  const roundedMin = Math.floor(minutes / 5) * 5;
  const isPast = roundedMin > 0 && roundedMin <= 30;
  const isTo = roundedMin > 30;
  let displayHour = hours % 12;

  if (isTo) {
    displayHour = (displayHour + 1) % 12;
  }

  // Minute words
  switch (roundedMin) {
    case 0:
      // O'CLOCK
      matches.push({ row: 9, start: 5, end: 11 }); // OCLOCK
      break;
    case 5:
    case 55:
      matches.push({ row: 2, start: 6, end: 10 }); // FIVE (minute)
      break;
    case 10:
    case 50:
      matches.push({ row: 3, start: 5, end: 8 }); // TEN (minute)
      break;
    case 15:
    case 45:
      matches.push({ row: 1, start: 2, end: 9 }); // QUARTER
      break;
    case 20:
    case 40:
      matches.push({ row: 2, start: 0, end: 6 }); // TWENTY
      break;
    case 25:
    case 35:
      matches.push({ row: 2, start: 0, end: 10 }); // TWENTYFIVE
      break;
    case 30:
      matches.push({ row: 3, start: 0, end: 4 }); // HALF
      break;
  }

  // PAST or TO
  if (isPast) {
    matches.push({ row: 4, start: 0, end: 4 }); // PAST
  } else if (isTo) {
    matches.push({ row: 3, start: 9, end: 11 }); // TO
  }

  // Hour words
  const hourMap: Record<number, WordMatch> = {
    0: { row: 8, start: 5, end: 11 },  // TWELVE
    1: { row: 5, start: 0, end: 3 },   // ONE
    2: { row: 6, start: 8, end: 11 },  // TWO
    3: { row: 5, start: 6, end: 11 },  // THREE
    4: { row: 6, start: 0, end: 4 },   // FOUR
    5: { row: 6, start: 4, end: 8 },   // FIVE
    6: { row: 5, start: 3, end: 6 },   // SIX
    7: { row: 8, start: 0, end: 5 },   // SEVEN
    8: { row: 7, start: 0, end: 5 },   // EIGHT
    9: { row: 4, start: 7, end: 11 },  // NINE
    10: { row: 9, start: 0, end: 3 },  // TEN
    11: { row: 7, start: 5, end: 11 }, // ELEVEN
  };

  if (hourMap[displayHour]) {
    matches.push(hourMap[displayHour]);
  }

  return matches;
}

function buildActiveSet(matches: WordMatch[]): Set<string> {
  const active = new Set<string>();
  for (const m of matches) {
    for (let c = m.start; c < m.end; c++) {
      active.add(`${m.row}-${c}`);
    }
  }
  return active;
}

export default function WordClock({ config, theme }: WidgetComponentProps) {
  const wcConfig = config as WordClockConfig | undefined;
  const accentMinutes = wcConfig?.accentMinutes ?? true;

  const [time, setTime] = useState<Date | null>(null);

  const { containerRef, scale } = useFitScale(340, 360);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <div className="w-20 h-20 rounded animate-pulse" style={{ backgroundColor: `${theme.accent}20` }} />
      </div>
    );
  }

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const matches = getTimeWords(hours, minutes);
  const active = buildActiveSet(matches);

  // Show dots for the remaining minutes (0-4 dots for minutes not captured by 5-min rounding)
  const extraMinutes = minutes % 5;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: `${theme.primary}08` }}
    >
      <div
        style={{
          width: 340,
          height: 360,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="flex flex-col items-center justify-center"
      >
        {/* Grid */}
        <div className="font-mono tracking-[0.35em] leading-[2.2] text-center select-none">
          {GRID.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-[2px]">
              {row.split('').map((char, ci) => {
                const isActive = active.has(`${ri}-${ci}`);
                return (
                  <span
                    key={ci}
                    className="inline-block w-[26px] text-center text-[17px] font-bold transition-all duration-700"
                    style={{
                      color: isActive ? theme.accent : `${theme.accent}15`,
                      textShadow: isActive ? `0 0 12px ${theme.accent}60` : 'none',
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        {/* Minute dots */}
        {accentMinutes && extraMinutes > 0 && (
          <div className="flex gap-2 mt-4">
            {Array.from({ length: extraMinutes }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: theme.accent, boxShadow: `0 0 6px ${theme.accent}60` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'word-clock',
  name: 'Word Clock',
  description: 'Display time as illuminated words on a letter grid',
  icon: 'type',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: WordClock,
  OptionsComponent: WordClockOptions,
  defaultProps: {
    accentMinutes: true,
  },
});
