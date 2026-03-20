'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import HolidayCalendarOptions from './HolidayCalendarOptions';

interface HolidayCalendarConfig {
  style?: 'modern' | 'bauhaus';
}

// Key holidays by 'M-D' format
const HOLIDAYS: Record<string, string> = {
  '1-1': "New Year's Day",
  '1-2': 'Science Fiction Day',
  '1-3': 'Festival of Sleep Day',
  '1-4': 'World Braille Day',
  '1-5': 'National Bird Day',
  '1-6': 'Bean Day',
  '1-7': 'Old Rock Day',
  '1-8': 'Bubble Bath Day',
  '1-9': 'National Static Electricity Day',
  '1-10': 'Houseplant Appreciation Day',
  '1-11': 'National Human Trafficking Awareness Day',
  '1-13': 'National Sticker Day',
  '1-15': 'National Hat Day',
  '1-18': 'Winnie the Pooh Day',
  '1-20': 'Penguin Awareness Day',
  '1-21': 'National Hugging Day',
  '1-24': 'International Day of Education',
  '1-27': 'International Holocaust Remembrance Day',
  '1-28': 'Data Privacy Day',
  '2-1': 'World Read Aloud Day',
  '2-2': 'Groundhog Day',
  '2-4': 'World Cancer Day',
  '2-7': 'National Send a Card Day',
  '2-9': 'National Pizza Day',
  '2-11': 'International Day of Women in Science',
  '2-12': 'Darwin Day',
  '2-13': 'World Radio Day',
  '2-14': "Valentine's Day",
  '2-17': 'Random Acts of Kindness Day',
  '2-20': 'World Day of Social Justice',
  '2-22': "World Thinking Day",
  '3-1': 'World Compliment Day',
  '3-3': 'World Wildlife Day',
  '3-8': "International Women's Day",
  '3-14': 'Pi Day',
  '3-17': "St. Patrick's Day",
  '3-20': 'International Day of Happiness',
  '3-21': 'World Poetry Day',
  '3-22': 'World Water Day',
  '3-26': 'Purple Day (Epilepsy Awareness)',
  '4-1': "April Fools' Day",
  '4-2': 'World Autism Awareness Day',
  '4-7': 'World Health Day',
  '4-12': 'International Day of Human Space Flight',
  '4-15': 'World Art Day',
  '4-22': 'Earth Day',
  '4-23': 'World Book Day',
  '4-25': 'World Penguin Day',
  '4-28': 'International Workers Memorial Day',
  '4-30': 'International Jazz Day',
  '5-1': "International Workers' Day",
  '5-3': 'World Press Freedom Day',
  '5-4': 'Star Wars Day',
  '5-5': 'Cinco de Mayo',
  '5-9': 'National Lost Sock Memorial Day',
  '5-12': 'International Nurses Day',
  '5-15': 'International Day of Families',
  '5-17': 'World Telecommunication Day',
  '5-20': 'World Bee Day',
  '5-21': 'World Day for Cultural Diversity',
  '5-25': 'Towel Day',
  '6-1': "Global Day of Parents",
  '6-5': 'World Environment Day',
  '6-8': 'World Oceans Day',
  '6-12': 'World Day Against Child Labour',
  '6-14': 'World Blood Donor Day',
  '6-17': 'World Day to Combat Desertification',
  '6-20': 'World Refugee Day',
  '6-21': 'Summer Solstice',
  '6-23': 'International Olympic Day',
  '6-30': 'Social Media Day',
  '7-1': 'International Joke Day',
  '7-2': 'World UFO Day',
  '7-4': 'Independence Day (USA)',
  '7-7': 'World Chocolate Day',
  '7-11': 'World Population Day',
  '7-17': 'World Emoji Day',
  '7-18': 'Nelson Mandela Day',
  '7-20': 'Moon Landing Day',
  '7-26': 'National Aunt and Uncle Day',
  '7-29': 'International Tiger Day',
  '7-30': 'International Friendship Day',
  '8-1': 'World Lung Cancer Day',
  '8-8': 'International Cat Day',
  '8-9': 'Book Lovers Day',
  '8-10': 'World Lion Day',
  '8-12': 'International Youth Day',
  '8-13': 'International Left-Handers Day',
  '8-19': 'World Photography Day',
  '8-21': 'World Senior Citizen Day',
  '8-26': 'National Dog Day',
  '9-1': 'World Letter Writing Day',
  '9-5': 'International Day of Charity',
  '9-8': 'International Literacy Day',
  '9-12': 'National Video Games Day',
  '9-15': 'International Day of Democracy',
  '9-19': 'Talk Like a Pirate Day',
  '9-21': 'International Day of Peace',
  '9-22': 'World Car-Free Day',
  '9-27': 'World Tourism Day',
  '9-28': 'World Rabies Day',
  '10-1': 'International Coffee Day',
  '10-2': 'International Day of Non-Violence',
  '10-4': 'World Animal Day',
  '10-5': "World Teachers' Day",
  '10-10': 'World Mental Health Day',
  '10-16': 'World Food Day',
  '10-24': 'United Nations Day',
  '10-29': 'National Cat Day',
  '10-31': 'Halloween',
  '11-1': 'World Vegan Day',
  '11-3': 'National Sandwich Day',
  '11-9': 'World Freedom Day',
  '11-11': 'Veterans Day',
  '11-13': 'World Kindness Day',
  '11-14': 'World Diabetes Day',
  '11-16': 'International Day for Tolerance',
  '11-19': 'International Men\'s Day',
  '11-21': 'World Television Day',
  '12-1': 'World AIDS Day',
  '12-3': 'International Day of Persons with Disabilities',
  '12-5': 'World Soil Day',
  '12-10': 'Human Rights Day',
  '12-11': 'International Mountain Day',
  '12-14': 'National Monkey Day',
  '12-18': 'International Migrants Day',
  '12-21': 'Winter Solstice',
  '12-25': 'Christmas Day',
  '12-31': "New Year's Eve",
};

// Fun fallback holidays for days not in the main list
const FUN_HOLIDAYS = [
  'National High Five Day',
  'National Nap Day',
  'World Smile Day',
  'National Cookie Day',
  'Bubble Wrap Appreciation Day',
  'National Compliment Day',
  'National Pajama Day',
  'National Donut Day',
  'National Ice Cream Day',
  'World Laughter Day',
  'National Taco Day',
  'National Popcorn Day',
  'National Dance Day',
  'World Music Day',
  'National Sunglasses Day',
  'National Puzzle Day',
  'National Picnic Day',
  'National Astronomy Day',
  'National Kite Flying Day',
  'National Origami Day',
  'National Doodle Day',
  'World Juggling Day',
  'National Treasure Day',
  'National Daydream Day',
  'National Storytelling Day',
  'National Color Day',
  'National Serenade Day',
  'World Coconut Day',
  'National Waffle Day',
  'National Crayon Day',
];

// Simple seeded random using day-of-year
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getHolidayForDate(date: Date): string {
  const key = `${date.getMonth() + 1}-${date.getDate()}`;
  if (HOLIDAYS[key]) return HOLIDAYS[key];
  const doy = getDayOfYear(date);
  // Seeded selection from fun holidays
  const index = ((doy * 137 + 7) * 31) % FUN_HOLIDAYS.length;
  return FUN_HOLIDAYS[index];
}

// Emoji map for seasonal/keyword decoration
function getEmoji(holiday: string, month: number): string {
  const lower = holiday.toLowerCase();
  if (lower.includes('christmas')) return '\u{1F384}';
  if (lower.includes("new year")) return '\u{1F389}';
  if (lower.includes('valentine')) return '\u{2764}\u{FE0F}';
  if (lower.includes('halloween')) return '\u{1F383}';
  if (lower.includes('earth')) return '\u{1F30D}';
  if (lower.includes('star wars')) return '\u{2B50}';
  if (lower.includes('pi day')) return '\u{1F967}';
  if (lower.includes('patrick')) return '\u{2618}\u{FE0F}';
  if (lower.includes('independence')) return '\u{1F386}';
  if (lower.includes('moon')) return '\u{1F315}';
  if (lower.includes('pizza')) return '\u{1F355}';
  if (lower.includes('cat')) return '\u{1F431}';
  if (lower.includes('dog')) return '\u{1F436}';
  if (lower.includes('book')) return '\u{1F4DA}';
  if (lower.includes('music') || lower.includes('jazz')) return '\u{1F3B5}';
  if (lower.includes('coffee')) return '\u{2615}';
  if (lower.includes('chocolate')) return '\u{1F36B}';
  if (lower.includes('emoji')) return '\u{1F60A}';
  if (lower.includes('penguin')) return '\u{1F427}';
  if (lower.includes('bee')) return '\u{1F41D}';
  if (lower.includes('ocean')) return '\u{1F30A}';
  if (lower.includes('peace')) return '\u{262E}\u{FE0F}';
  if (lower.includes('smile') || lower.includes('laugh')) return '\u{1F604}';
  if (lower.includes('cookie')) return '\u{1F36A}';
  if (lower.includes('taco')) return '\u{1F32E}';
  if (lower.includes('donut')) return '\u{1F369}';
  if (lower.includes('ice cream')) return '\u{1F366}';
  if (lower.includes('waffle')) return '\u{1F9C7}';
  if (lower.includes('popcorn')) return '\u{1F37F}';
  // Seasonal fallback
  if (month >= 2 && month <= 4) return '\u{1F338}';
  if (month >= 5 && month <= 7) return '\u{2600}\u{FE0F}';
  if (month >= 8 && month <= 10) return '\u{1F341}';
  return '\u{2744}\u{FE0F}';
}

const BAUHAUS_COLORS = ['#FDCA21', '#0C4E82', '#48525B'] as const;
const BAUHAUS_RED = '#C33531';

function BauhausHolidayName({ name }: { name: string }) {
  // Color each word with rotating Bauhaus palette, apostrophes in red
  const words = name.split(' ');
  return (
    <div className="font-bold leading-tight text-center" style={{ fontSize: 22 }}>
      {words.map((word, wi) => {
        const color = BAUHAUS_COLORS[wi % BAUHAUS_COLORS.length];
        // Render apostrophes in red
        const parts = word.split(/(')/);
        return (
          <span key={wi}>
            {parts.map((part, pi) =>
              part === "'" ? (
                <span key={pi} style={{ color: BAUHAUS_RED }}>
                  &apos;
                </span>
              ) : (
                <span key={pi} style={{ color }}>
                  {part}
                </span>
              )
            )}
            {wi < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
}

export default function HolidayCalendar({ config }: WidgetComponentProps) {
  const calConfig = config as HolidayCalendarConfig | undefined;
  const style = calConfig?.style ?? 'modern';
  const { containerRef, scale } = useFitScale(200, 200);
  const [now, setNow] = useState(() => new Date());

  // Auto-update at midnight (check every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = new Date();
      if (current.getDate() !== now.getDate()) {
        setNow(current);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [now]);

  const holiday = getHolidayForDate(now);
  const month = now.getMonth();
  const emoji = getEmoji(holiday, month);
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (style === 'bauhaus') {
    const dateUpper = now
      .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      .toUpperCase();
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#E2E3E8' }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            width: 200,
            height: 200,
          }}
          className="flex flex-col items-center justify-center gap-2 px-2"
        >
          <div
            className="text-xs font-semibold tracking-widest"
            style={{ color: '#48525B', fontSize: 10 }}
          >
            {dateUpper}
          </div>
          <div
            className="w-12 border-t-2"
            style={{ borderColor: BAUHAUS_RED }}
          />
          <BauhausHolidayName name={holiday} />
        </div>
      </div>
    );
  }

  // Modern style
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden bg-gray-900 rounded-lg"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: 200,
          height: 200,
        }}
        className="flex flex-col items-center justify-center gap-2 px-3"
      >
        <div className="text-3xl">{emoji}</div>
        <div className="bg-white/10 rounded-md px-2 py-0.5 text-[10px] font-medium text-gray-300 tracking-wide uppercase">
          {dateStr}
        </div>
        <div className="text-white font-bold text-center leading-tight" style={{ fontSize: 18 }}>
          {holiday}
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

