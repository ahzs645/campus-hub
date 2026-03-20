'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import BottleSpinOptions from './BottleSpinOptions';

interface BottleSpinConfig {
  spinInterval?: number; // seconds between auto-spins, default 30
}

type SpinPhase = 'idle' | 'windup' | 'spinning' | 'pulse';

export default function BottleSpin({ config, theme }: WidgetComponentProps) {
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
    // Wind-up phase
    setPhase('windup');

    timeoutRef.current = setTimeout(() => {
      // Spin forward: 3-8 random full rotations
      const rotations = 3 + Math.random() * 5;
      const duration = 3 + Math.random() * 2; // 3-5s
      setSpinDuration(duration);
      setRotation(prev => prev + rotations * 360);
      setPhase('spinning');

      timeoutRef.current = setTimeout(() => {
        // Pulse phase
        setPhase('pulse');

        timeoutRef.current = setTimeout(() => {
          setPhase('idle');
        }, 2000);
      }, duration * 1000);
    }, 400); // windup duration
  }, []);

  // Auto-spin on interval
  useEffect(() => {
    doSpin(); // initial spin
    intervalRef.current = setInterval(doSpin, spinInterval * 1000);
    return clearTimers;
  }, [spinInterval, doSpin, clearTimers]);

  const bottleStyle: React.CSSProperties = {
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
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: `${theme.primary}20` }}
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
        className="flex items-center justify-center"
      >
        <svg
          width="60"
          height="160"
          viewBox="0 0 60 160"
          style={bottleStyle}
        >
          {/* Bottle silhouette */}
          <defs>
            <linearGradient id="bottleGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity="0.9" />
              <stop offset="100%" stopColor={theme.primary} stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* Neck */}
          <rect x="23" y="0" width="14" height="40" rx="4" fill="url(#bottleGrad)" />
          {/* Neck ring */}
          <rect x="20" y="36" width="20" height="6" rx="3" fill="url(#bottleGrad)" />
          {/* Shoulder taper */}
          <path
            d="M20 42 Q20 60 8 75 L8 140 Q8 155 20 155 L40 155 Q52 155 52 140 L52 75 Q40 60 40 42 Z"
            fill="url(#bottleGrad)"
          />
          {/* Highlight */}
          <rect x="16" y="80" width="6" height="50" rx="3" fill="white" opacity="0.15" />
        </svg>
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
