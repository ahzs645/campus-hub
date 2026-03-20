'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import KaomojiOptions from './KaomojiOptions';

interface KaomojiConfig {
  cycleInterval?: number; // seconds, default 5
}

const KAOMOJI = [
  { face: '(\u25D5\u203F\u25D5)', mood: 'Happy' },
  { face: '(\uFF89\u25D5\u30EE\u25D5)\uFF89*:\u30FB\uFF9F\u2727', mood: 'Excited' },
  { face: '(\u2665\u03C9\u2665*)', mood: 'Love' },
  { face: '(\u30FB_\u30FB)', mood: 'Neutral' },
  { face: '(\u00AC\u203F\u00AC)', mood: 'Thinking' },
  { face: '(\u2565_\u2565)', mood: 'Sad' },
  { face: '(\u2299_\u2299)', mood: 'Surprised' },
  { face: '(\u2044 \u2044>\u2044 \u25BD \u2044<\u2044 \u2044)', mood: 'Shy' },
  { face: '(\u3065\uFF61\u25D5\u203F\u203F\u25D5\uFF61)\u3065', mood: 'Hug' },
  { face: '(\u30CE\u0CA0\u76CA\u0CA0)\u30CE\u5F61\u253B\u2501\u253B', mood: 'Angry' },
  { face: '(\uFFE3\u03C9\uFFE3)', mood: 'Content' },
  { face: '(\u2310\u25A0_\u25A0)', mood: 'Cool' },
];

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

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full overflow-hidden"
    >
      <div
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        className="flex flex-col items-center justify-center"
      >
        <div
          className="text-4xl font-medium text-[var(--ui-text)] whitespace-nowrap transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {current.face}
        </div>
        <div
          className="mt-2 text-sm text-[var(--ui-text-muted)] tracking-wide uppercase transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
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
