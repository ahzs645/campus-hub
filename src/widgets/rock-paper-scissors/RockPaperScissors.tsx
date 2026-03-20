'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import RockPaperScissorsOptions from './RockPaperScissorsOptions';

interface RPSConfig {
  playInterval?: number; // seconds between auto-plays, default 15
}

const CHOICES = [
  { emoji: '✊', name: 'Rock' },
  { emoji: '✋', name: 'Paper' },
  { emoji: '✌️', name: 'Scissors' },
] as const;

export default function RockPaperScissors({ config, theme }: WidgetComponentProps) {
  const cfg = config as RPSConfig | undefined;
  const playInterval = cfg?.playInterval ?? 15;

  const { containerRef, scale } = useFitScale(200, 200);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCycling, setIsCycling] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    if (cycleRef.current) clearInterval(cycleRef.current);
  }, []);

  const doPlay = useCallback(() => {
    setIsCycling(true);
    setCycleCount(0);
    let count = 0;

    if (cycleRef.current) clearInterval(cycleRef.current);

    cycleRef.current = setInterval(() => {
      count++;
      setCurrentIndex(Math.floor(Math.random() * 3));
      setCycleCount(count);

      if (count >= 6) {
        if (cycleRef.current) clearInterval(cycleRef.current);
        // Land on final random result
        setCurrentIndex(Math.floor(Math.random() * 3));
        setIsCycling(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    doPlay(); // initial play
    playIntervalRef.current = setInterval(doPlay, playInterval * 1000);
    return clearTimers;
  }, [playInterval, doPlay, clearTimers]);

  const choice = CHOICES[currentIndex];

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <style>{`
        @keyframes rpsShake {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-8px); }
          75% { transform: translateY(8px); }
        }
      `}</style>
      <div
        style={{
          width: 200,
          height: 200,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="flex flex-col items-center justify-center gap-2"
      >
        <div
          style={{
            fontSize: '5rem',
            lineHeight: 1,
            animation: isCycling ? 'rpsShake 300ms ease-in-out infinite' : 'none',
          }}
        >
          {choice.emoji}
        </div>
        <div
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: theme.accent }}
        >
          {choice.name}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'rock-paper-scissors',
  name: 'Rock Paper Scissors',
  description: 'Auto-playing RPS game',
  icon: 'hand',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: RockPaperScissors,
  OptionsComponent: RockPaperScissorsOptions,
  defaultProps: { playInterval: 15 },
});
