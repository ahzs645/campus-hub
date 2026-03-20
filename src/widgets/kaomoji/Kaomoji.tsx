'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import KaomojiOptions from './KaomojiOptions';

interface KaomojiConfig {
  cycleInterval?: number;
}

const KAOMOJI = [
  { face: '(◕‿◕)', mood: 'Happy' },
  { face: '(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧', mood: 'Excited' },
  { face: '(♥ω♥*)', mood: 'Love' },
  { face: '(・_・)', mood: 'Neutral' },
  { face: '(¬‿¬)', mood: 'Thinking' },
  { face: '(╥_╥)', mood: 'Sad' },
  { face: '(⊙_⊙)', mood: 'Surprised' },
  { face: '(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)', mood: 'Shy' },
  { face: '(づ｡◕‿‿◕｡)づ', mood: 'Hug' },
  { face: '(ノಠ益ಠ)ノ彡┻━┻', mood: 'Angry' },
  { face: '(￣ω￣)', mood: 'Content' },
  { face: '(⌐■_■)', mood: 'Cool' },
];

const MOOD_COLORS: Record<string, string> = {
  Happy: '#FDFBFF',
  Excited: '#FDFBFF',
  Hug: '#FDFBFF',
  Love: '#D81921',
  Shy: '#D81921',
  Neutral: '#ABABAF',
  Thinking: '#ABABAF',
  Sad: '#ABABAF',
  Surprised: '#FDFBFF',
  Angry: '#FDFBFF',
  Cool: '#ABABAF',
  Content: '#ABABAF',
};

export default function Kaomoji({ config: rawConfig }: WidgetComponentProps) {
  const config = (rawConfig ?? {}) as KaomojiConfig;
  const cycleInterval = (config.cycleInterval ?? 5) * 1000;

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const { containerRef, scale } = useFitScale(200, 160);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % KAOMOJI.length);
        setVisible(true);
      }, 500);
    }, cycleInterval);

    return () => clearInterval(timer);
  }, [cycleInterval]);

  const current = KAOMOJI[index];
  const moodColor = MOOD_COLORS[current.mood] ?? '#FDFBFF';

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full overflow-hidden"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22 }}
    >
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        className="flex flex-col items-center justify-center"
      >
        <div
          className="font-medium whitespace-nowrap transition-opacity duration-500 text-center"
          style={{
            opacity: visible ? 1 : 0,
            color: moodColor,
            fontSize: '3rem',
            lineHeight: 1.1,
          }}
        >
          {current.face}
        </div>
        <div
          className="transition-opacity duration-500"
          style={{
            opacity: visible ? 1 : 0,
            color: '#5E5E62',
            fontFamily: 'var(--font-ndot, monospace)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 8,
          }}
        >
          {current.mood}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'kaomoji',
  name: 'Kaomoji',
  description: 'Cycling Japanese emoticons',
  icon: 'smile',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: Kaomoji,
  OptionsComponent: KaomojiOptions,
  defaultProps: { cycleInterval: 5 },
});
