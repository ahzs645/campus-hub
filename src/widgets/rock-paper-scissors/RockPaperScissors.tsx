'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import RockPaperScissorsOptions from './RockPaperScissorsOptions';

interface RPSConfig {
  playInterval?: number;
}

const CHOICES = [
  {
    name: 'Rock',
    image: 'https://res.cloudinary.com/htoohtoo/image/upload/v1771522193/Rock_ht4tte.png',
  },
  {
    name: 'Paper',
    image: 'https://res.cloudinary.com/htoohtoo/image/upload/v1771522205/Paper_vuuq09.png',
  },
  {
    name: 'Scissors',
    image: 'https://res.cloudinary.com/htoohtoo/image/upload/v1771522224/Scissor_hsexon.png',
  },
] as const;

export default function RockPaperScissors({ config }: WidgetComponentProps) {
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
        setCurrentIndex(Math.floor(Math.random() * 3));
        setIsCycling(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    doPlay();
    playIntervalRef.current = setInterval(doPlay, playInterval * 1000);
    return clearTimers;
  }, [playInterval, doPlay, clearTimers]);

  const choice = CHOICES[currentIndex];

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22, padding: 16 }}
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
        className="flex flex-col items-center justify-center gap-3"
      >
        <div
          style={{
            width: 90,
            height: 90,
            animation: isCycling ? 'rpsShake 400ms ease-in-out infinite' : 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={choice.image}
            alt={choice.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'invert(1) brightness(0.9)',
            }}
            draggable={false}
          />
        </div>
        <div
          style={{
            color: '#D81921',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
          }}
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
