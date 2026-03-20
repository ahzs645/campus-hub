'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import BottleSpinOptions from './BottleSpinOptions';

interface BottleSpinConfig {
  spinInterval?: number;
}

type SpinPhase = 'idle' | 'windup' | 'spinning' | 'pulse';

const BOTTLE_URL = 'https://res.cloudinary.com/htoohtoo/image/upload/v1771519987/Bottle_tkeadp.png';

export default function BottleSpin({ config }: WidgetComponentProps) {
  const cfg = config as BottleSpinConfig | undefined;
  const spinInterval = cfg?.spinInterval ?? 30;

  const { containerRef, scale } = useFitScale(200, 200);
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(4);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const doSpin = useCallback(() => {
    setPhase('windup');

    timeoutRef.current = setTimeout(() => {
      const rotations = 3 + Math.random() * 5;
      const duration = 3 + Math.random() * 2;
      setSpinDuration(duration);
      setRotation(prev => prev + rotations * 360);
      setPhase('spinning');

      timeoutRef.current = setTimeout(() => {
        setPhase('pulse');

        timeoutRef.current = setTimeout(() => {
          setPhase('idle');
        }, 2000);
      }, duration * 1000);
    }, 400);
  }, []);

  useEffect(() => {
    doSpin();
    intervalRef.current = setInterval(doSpin, spinInterval * 1000);
    return clearTimers;
  }, [spinInterval, doSpin, clearTimers]);

  const bottleStyle: React.CSSProperties = {
    width: 60,
    height: 140,
    objectFit: 'contain',
    transform: phase === 'windup'
      ? `rotate(${rotation - 30}deg)`
      : `rotate(${rotation}deg)`,
    transition: phase === 'windup'
      ? 'transform 400ms ease-in'
      : phase === 'spinning'
        ? `transform ${spinDuration}s cubic-bezier(0.2, 0.8, 0.3, 1)`
        : 'none',
    animation: phase === 'pulse' ? 'bottlePulse 0.5s ease-in-out 4' : 'none',
    transformOrigin: 'center center',
    filter: 'invert(1) brightness(0.9)',
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22 }}
    >
      <style>{`
        @keyframes bottlePulse {
          0%, 100% { transform: rotate(${rotation}deg) scale(1); }
          50% { transform: rotate(${rotation}deg) scale(1.08); }
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BOTTLE_URL}
          alt="Bottle"
          style={bottleStyle}
          draggable={false}
        />
        <div
          style={{
            color: '#5E5E62',
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          {phase === 'spinning' ? 'SPINNING...' : phase === 'pulse' ? 'LANDED' : 'SPIN THE BOTTLE'}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'bottle-spin',
  name: 'Bottle Spin',
  description: 'Auto-spinning bottle animation',
  icon: 'wine',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: BottleSpin,
  OptionsComponent: BottleSpinOptions,
  defaultProps: { spinInterval: 30 },
});
