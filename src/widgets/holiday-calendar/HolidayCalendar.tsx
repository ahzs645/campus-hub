'use client';

import { useState, useEffect, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import { DotMatrixText, textToChars, type DotChar } from '@/lib/dot-matrix';
import HolidayCalendarOptions from './HolidayCalendarOptions';

interface HolidayCalendarConfig {
  style?: 'modern' | 'bauhaus';
}

// Key holidays by 'M-D' format
const HOLIDAYS: Record<string, string> = {
  '1-1': "New Year's Day", '1-2': 'Science Fiction Day', '1-3': 'Festival of Sleep Day',
  '1-4': 'World Braille Day', '1-5': 'National Bird Day', '1-6': 'Bean Day',
  '1-7': 'Old Rock Day', '1-8': 'Bubble Bath Day', '1-9': 'Static Electricity Day',
  '1-10': 'Houseplant Day', '1-11': 'Human Trafficking Awareness',
  '1-13': 'National Sticker Day', '1-15': 'National Hat Day', '1-18': 'Winnie the Pooh Day',
  '1-20': 'Penguin Awareness Day', '1-21': 'National Hugging Day',
  '1-24': 'Day of Education', '1-27': 'Holocaust Remembrance Day', '1-28': 'Data Privacy Day',
  '2-1': 'Read Aloud Day', '2-2': 'Groundhog Day', '2-4': 'World Cancer Day',
  '2-7': 'Send a Card Day', '2-9': 'National Pizza Day', '2-11': 'Women in Science Day',
  '2-12': 'Darwin Day', '2-13': 'World Radio Day', '2-14': "Valentine's Day",
  '2-17': 'Random Kindness Day', '2-20': 'Social Justice Day', '2-22': 'World Thinking Day',
  '3-1': 'Compliment Day', '3-3': 'World Wildlife Day', '3-8': "Women's Day",
  '3-14': 'Pi Day', '3-17': "St Patrick's Day", '3-20': 'Happiness Day',
  '3-21': 'World Poetry Day', '3-22': 'World Water Day', '3-26': 'Purple Day',
  '4-1': "April Fools Day", '4-2': 'Autism Awareness Day', '4-7': 'World Health Day',
  '4-12': 'Space Flight Day', '4-15': 'World Art Day', '4-22': 'Earth Day',
  '4-23': 'World Book Day', '4-25': 'World Penguin Day', '4-30': 'Jazz Day',
  '5-1': "Workers Day", '5-3': 'Press Freedom Day', '5-4': 'Star Wars Day',
  '5-5': 'Cinco de Mayo', '5-9': 'Lost Sock Day', '5-12': 'Nurses Day',
  '5-15': 'Families Day', '5-20': 'World Bee Day', '5-25': 'Towel Day',
  '6-5': 'Environment Day', '6-8': 'World Oceans Day', '6-14': 'Blood Donor Day',
  '6-20': 'World Refugee Day', '6-21': 'Summer Solstice', '6-30': 'Social Media Day',
  '7-1': 'Joke Day', '7-2': 'World UFO Day', '7-4': 'Independence Day',
  '7-7': 'Chocolate Day', '7-17': 'World Emoji Day', '7-18': 'Mandela Day',
  '7-20': 'Moon Landing Day', '7-29': 'Tiger Day', '7-30': 'Friendship Day',
  '8-8': 'International Cat Day', '8-9': 'Book Lovers Day', '8-10': 'World Lion Day',
  '8-12': 'Youth Day', '8-13': 'Left Handers Day', '8-19': 'Photography Day',
  '8-26': 'National Dog Day', '9-5': 'Day of Charity', '9-8': 'Literacy Day',
  '9-12': 'Video Games Day', '9-19': 'Talk Like a Pirate Day', '9-21': 'Peace Day',
  '9-22': 'Car Free Day', '9-27': 'Tourism Day',
  '10-1': 'Coffee Day', '10-4': 'Animal Day', '10-5': "Teachers Day",
  '10-10': 'Mental Health Day', '10-16': 'World Food Day', '10-29': 'National Cat Day',
  '10-31': 'Halloween', '11-1': 'World Vegan Day', '11-3': 'Sandwich Day',
  '11-11': 'Veterans Day', '11-13': 'Kindness Day', '11-21': 'Television Day',
  '12-1': 'World AIDS Day', '12-5': 'World Soil Day', '12-10': 'Human Rights Day',
  '12-14': 'Monkey Day', '12-21': 'Winter Solstice', '12-25': 'Christmas Day',
  '12-31': "New Years Eve",
};

const FUN_HOLIDAYS = [
  'High Five Day', 'National Nap Day', 'World Smile Day', 'Cookie Day',
  'Bubble Wrap Day', 'Compliment Day', 'Pajama Day', 'Donut Day',
  'Ice Cream Day', 'Laughter Day', 'National Taco Day', 'Popcorn Day',
  'Dance Day', 'World Music Day', 'Sunglasses Day', 'Puzzle Day',
  'Picnic Day', 'Astronomy Day', 'Kite Flying Day', 'Origami Day',
  'Doodle Day', 'Juggling Day', 'Treasure Day', 'Daydream Day',
  'Storytelling Day', 'Color Day', 'Serenade Day', 'Coconut Day',
  'Waffle Day', 'Crayon Day',
];

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

function getHolidayForDate(date: Date): string {
  const key = `${date.getMonth() + 1}-${date.getDate()}`;
  if (HOLIDAYS[key]) return HOLIDAYS[key];
  const doy = getDayOfYear(date);
  return FUN_HOLIDAYS[((doy * 137 + 7) * 31) % FUN_HOLIDAYS.length];
}

function getEmojis(holiday: string, month: number): string[] {
  const lower = holiday.toLowerCase();
  if (lower.includes('christmas')) return ['🎄', '🎅', '❄️', '🎁'];
  if (lower.includes('new year')) return ['🎉', '🎊', '🥳', '✨'];
  if (lower.includes('valentine')) return ['❤️', '💕', '💖', '🌹'];
  if (lower.includes('halloween')) return ['🎃', '👻', '🦇', '🍬'];
  if (lower.includes('earth')) return ['🌍', '🌱', '♻️', '🌳'];
  if (lower.includes('star wars')) return ['⭐', '🌌', '🚀', '✨'];
  if (lower.includes('pi day')) return ['🥧', '🔢', '📐', '✨'];
  if (lower.includes('patrick')) return ['☘️', '🍀', '💚', '🌈'];
  if (lower.includes('independence')) return ['🇺🇸', '🎆', '🎇', '✨'];
  if (lower.includes('pizza')) return ['🍕', '🧀', '🍅', '✨'];
  if (lower.includes('cat')) return ['🐱', '😺', '🐈', '✨'];
  if (lower.includes('dog')) return ['🐶', '🐕', '🦮', '✨'];
  if (lower.includes('book')) return ['📚', '📖', '✍️', '📝'];
  if (lower.includes('music') || lower.includes('jazz')) return ['🎵', '🎶', '🎸', '🎹'];
  if (lower.includes('coffee')) return ['☕', '🫘', '☕', '✨'];
  if (lower.includes('chocolate')) return ['🍫', '🍬', '🍩', '🧁'];
  if (lower.includes('emoji')) return ['😊', '😎', '🥳', '✨'];
  if (lower.includes('penguin')) return ['🐧', '❄️', '🧊', '✨'];
  if (lower.includes('bee')) return ['🐝', '🌻', '🍯', '✨'];
  if (lower.includes('ocean')) return ['🌊', '🐠', '🐬', '🦈'];
  if (lower.includes('peace')) return ['☮️', '🕊️', '🌿', '✨'];
  if (month >= 2 && month <= 4) return ['🌸', '🌷', '🌼', '✨'];
  if (month >= 5 && month <= 7) return ['☀️', '🌴', '🏖️', '✨'];
  if (month >= 8 && month <= 10) return ['🍂', '🍁', '🎃', '✨'];
  return ['❄️', '⛄', '🎄', '✨'];
}

const BAUHAUS_WORD_COLORS = ['#FDCA21', '#0C4E82', '#48525B'] as const;

/** Break text into lines that fit within maxCols characters */
function wrapText(text: string, maxCols: number): string[] {
  const words = text.toUpperCase().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCols && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function HolidayCalendar({ config }: WidgetComponentProps) {
  const calConfig = config as HolidayCalendarConfig | undefined;
  const style = calConfig?.style ?? 'modern';
  const { containerRef, scale } = useFitScale(220, 220);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date();
      if (current.getDate() !== now.getDate()) setNow(current);
    }, 60_000);
    return () => clearInterval(interval);
  }, [now]);

  const holiday = getHolidayForDate(now);
  const month = now.getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateLabel = `${monthNames[month]} ${now.getDate()}`;
  const holidayLines = useMemo(() => wrapText(holiday, 12), [holiday]);

  if (style === 'bauhaus') {
    // Bauhaus: light bg, date in red dots, holiday in colored dots
    const dateChars: DotChar[] = dateLabel.toUpperCase().split('').map((ch) => ({
      char: ch,
      color: '#C33531',
    }));

    // Color each word with rotating Bauhaus palette
    const holidayCharsPerLine = holidayLines.map((line) => {
      const words = line.split(' ');
      const chars: DotChar[] = [];
      let wordIdx = 0;
      for (const word of words) {
        if (chars.length > 0) chars.push({ char: ' ', color: 'transparent' });
        const color = BAUHAUS_WORD_COLORS[wordIdx % BAUHAUS_WORD_COLORS.length];
        for (const ch of word) chars.push({ char: ch, color });
        wordIdx++;
      }
      return chars;
    });

    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#E2E3E8', borderRadius: 22 }}
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: 220, height: 220 }}
          className="flex flex-col items-center justify-center gap-3 px-3"
        >
          <DotMatrixText chars={dateChars} dotSize={3.5} gap={1} emptyColor="#C5C6CB" showEmpty />
          <div className="flex flex-col items-center gap-2">
            {holidayCharsPerLine.map((lineChars, i) => (
              <DotMatrixText key={i} chars={lineChars} dotSize={4.5} gap={1.2} emptyColor="#C5C6CB" showEmpty />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Modern style: dark bg, emoji row, "Happy" greeting, dot-matrix holiday, date
  const emojis = getEmojis(holiday, month);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22 }}
    >
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: 220, height: 220 }}
        className="flex flex-col items-center justify-center gap-2 px-3"
      >
        {/* Emoji row */}
        <div className="flex gap-1.5" style={{ fontSize: 24 }}>
          {emojis.map((e, i) => <span key={i}>{e}</span>)}
        </div>

        {/* Greeting */}
        <div style={{ color: '#ABABAF', fontSize: 14, fontWeight: 500 }}>Happy</div>

        {/* Holiday name in dot-matrix */}
        <div className="flex flex-col items-center gap-1.5">
          {holidayLines.map((line, i) => (
            <DotMatrixText
              key={i}
              chars={textToChars(line, '#FDFBFF')}
              dotSize={3}
              gap={0.8}
              emptyColor="#2A2A2E"
              showEmpty
            />
          ))}
        </div>

        {/* Date in dot-matrix */}
        <div className="mt-1">
          <DotMatrixText
            chars={textToChars(dateLabel, '#ABABAF')}
            dotSize={2.5}
            gap={0.8}
          />
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'holiday-calendar',
  name: 'Holiday Calendar',
  description: 'Daily holiday celebrations',
  icon: 'partyPopper',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: HolidayCalendar,
  OptionsComponent: HolidayCalendarOptions,
  defaultProps: { style: 'modern' },
});
