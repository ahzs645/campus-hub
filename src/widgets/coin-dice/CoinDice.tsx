'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import CoinDiceOptions from './CoinDiceOptions';

interface CoinDiceConfig {
  mode?: 'coin' | 'dice' | 'both';
  interval?: number;
  diceType?: 'd6' | 'd8' | 'd12' | 'd20';
}

interface HistoryEntry {
  type: 'coin' | 'dice';
  value: number;
  timestamp: number;
}

function getDayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const DICE_MAX: Record<string, number> = { d6: 6, d8: 8, d12: 12, d20: 20 };

export default function CoinDice({ config, theme }: WidgetComponentProps) {
  const cfg = config as CoinDiceConfig | undefined;
  const mode = cfg?.mode ?? 'both';
  const interval = cfg?.interval ?? 60;
  const diceType = cfg?.diceType ?? 'd6';
  const maxFace = DICE_MAX[diceType] ?? 6;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [animating, setAnimating] = useState(false);
  const [currentCoin, setCurrentCoin] = useState<number | null>(null);
  const [currentDice, setCurrentDice] = useState<number | null>(null);
  const dayKeyRef = useRef(getDayKey());

  const {
    containerRef, scale, designWidth: BASE_W, designHeight: DESIGN_H,
    isLandscape, containerWidth, containerHeight,
  } = useAdaptiveFitScale({
    landscape: { w: 420, h: 180 },
    portrait: { w: 240, h: 340 },
  });

  // Stretch to fill container width (like Countdown)
  const DESIGN_W = containerWidth > 0 ? Math.max(BASE_W, containerWidth / scale) : BASE_W;
  const ACTUAL_H = containerHeight > 0 ? Math.max(DESIGN_H, containerHeight / scale) : DESIGN_H;

  const doFlip = useCallback(() => {
    const today = getDayKey();
    if (today !== dayKeyRef.current) {
      dayKeyRef.current = today;
      setHistory([]);
    }

    setAnimating(true);

    setTimeout(() => {
      const entries: HistoryEntry[] = [];
      const now = Date.now();

      if (mode === 'coin' || mode === 'both') {
        const val = Math.random() < 0.5 ? 0 : 1;
        setCurrentCoin(val);
        entries.push({ type: 'coin', value: val, timestamp: now });
      }
      if (mode === 'dice' || mode === 'both') {
        const val = Math.floor(Math.random() * maxFace) + 1;
        setCurrentDice(val);
        entries.push({ type: 'dice', value: val, timestamp: now });
      }

      setHistory(prev => [...prev, ...entries]);
      setAnimating(false);
    }, 800);
  }, [mode, maxFace]);

  useEffect(() => {
    doFlip();
    const timer = setInterval(doFlip, interval * 1000);
    return () => clearInterval(timer);
  }, [doFlip, interval]);

  const coinHistory = history.filter(h => h.type === 'coin');
  const diceHistory = history.filter(h => h.type === 'dice');
  const heads = coinHistory.filter(h => h.value === 0).length;
  const tails = coinHistory.filter(h => h.value === 1).length;

  const diceDist: number[] = new Array(maxFace).fill(0);
  diceHistory.forEach(h => { diceDist[h.value - 1]++; });
  const maxCount = Math.max(1, ...diceDist);

  const showCoin = mode === 'coin' || mode === 'both';
  const showDice = mode === 'dice' || mode === 'both';

  // Scale coin/dice size based on available space
  const iconSize = isLandscape ? Math.min(64, ACTUAL_H * 0.35) : Math.min(72, DESIGN_W * 0.28);
  const iconFontSize = iconSize * 0.4;
  const barHeight = isLandscape ? Math.max(30, ACTUAL_H * 0.2) : 40;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: '#111113', borderRadius: 22 }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: ACTUAL_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col px-5 py-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 shrink-0">
          <span
            style={{
              color: theme.accent,
              fontFamily: 'monospace',
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            {mode === 'coin' ? 'Coin Flip' : mode === 'dice' ? 'Dice Roll' : 'Coin & Dice'}
          </span>
          <span
            style={{
              color: '#5E5E62',
              fontFamily: 'monospace',
              fontSize: '0.5rem',
            }}
          >
            {history.length} today
          </span>
        </div>

        {/* Main content area - fills remaining space */}
        {isLandscape ? (
          /* ── Landscape: icons left, stats right ── */
          <div className="flex-1 flex items-center gap-6 min-h-0">
            {/* Icons */}
            <div className="flex items-center gap-5 shrink-0">
              {showCoin && (
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-full flex items-center justify-center font-bold"
                    style={{
                      width: iconSize, height: iconSize, fontSize: iconFontSize,
                      backgroundColor: currentCoin === 0 ? '#FFD700' : '#C0C0C0',
                      color: currentCoin === 0 ? '#1A1A1A' : '#2A2A2A',
                      transform: animating ? 'rotateY(720deg) scale(0.8)' : 'rotateY(0deg) scale(1)',
                      transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      boxShadow: `0 4px 20px ${currentCoin === 0 ? '#FFD70040' : '#C0C0C040'}`,
                    }}
                  >
                    {currentCoin === null ? '?' : currentCoin === 0 ? 'H' : 'T'}
                  </div>
                  <span className="text-xs mt-1.5 font-medium" style={{ color: '#DDDDE1' }}>
                    {currentCoin === null ? '...' : currentCoin === 0 ? 'Heads' : 'Tails'}
                  </span>
                </div>
              )}
              {showDice && (
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-xl flex items-center justify-center font-bold"
                    style={{
                      width: iconSize, height: iconSize, fontSize: iconFontSize,
                      backgroundColor: '#2A2A2D',
                      color: theme.accent,
                      border: `2px solid ${theme.accent}60`,
                      transform: animating ? 'rotate(360deg) scale(0.8)' : 'rotate(0deg) scale(1)',
                      transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      boxShadow: `0 4px 20px ${theme.accent}20`,
                    }}
                  >
                    {currentDice ?? '?'}
                  </div>
                  <span className="text-xs mt-1.5 font-medium" style={{ color: '#DDDDE1' }}>
                    {diceType.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Stats - fills remaining width */}
            <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
              {showCoin && coinHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: '#8E8E93', fontFamily: 'monospace', fontSize: '0.55rem' }}>HEADS vs TAILS</span>
                    <span style={{ color: '#5E5E62', fontFamily: 'monospace', fontSize: '0.55rem' }}>{heads} : {tails}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2D' }}>
                    <div className="h-full transition-all duration-500" style={{ width: `${(heads / coinHistory.length) * 100}%`, backgroundColor: '#FFD700', minWidth: heads > 0 ? 4 : 0 }} />
                    <div className="h-full transition-all duration-500" style={{ width: `${(tails / coinHistory.length) * 100}%`, backgroundColor: '#C0C0C0', minWidth: tails > 0 ? 4 : 0 }} />
                  </div>
                </div>
              )}
              {showDice && diceHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: '#8E8E93', fontFamily: 'monospace', fontSize: '0.55rem' }}>DISTRIBUTION</span>
                    <span style={{ color: '#5E5E62', fontFamily: 'monospace', fontSize: '0.55rem' }}>
                      avg {(diceHistory.reduce((s, h) => s + h.value, 0) / diceHistory.length).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-end gap-px" style={{ height: barHeight }}>
                    {diceDist.map((count, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="w-full rounded-t transition-all duration-500" style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? 3 : 0, backgroundColor: theme.accent, opacity: count > 0 ? 0.5 + (count / maxCount) * 0.5 : 0.15 }} />
                        {maxFace <= 12 && <span className="text-center mt-0.5" style={{ color: '#5E5E62', fontFamily: 'monospace', fontSize: maxFace <= 8 ? '0.5rem' : '0.4rem' }}>{i + 1}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-center" style={{ color: '#3A3A3D', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em' }}>
                {interval >= 60 ? `EVERY ${Math.round(interval / 60)} MIN` : `EVERY ${interval}S`}
              </div>
            </div>
          </div>
        ) : (
          /* ── Portrait: icons top, stats bottom ── */
          <>
            <div className="flex-1 flex items-center justify-center gap-6 min-h-0">
              {showCoin && (
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-full flex items-center justify-center font-bold"
                    style={{
                      width: iconSize, height: iconSize, fontSize: iconFontSize,
                      backgroundColor: currentCoin === 0 ? '#FFD700' : '#C0C0C0',
                      color: currentCoin === 0 ? '#1A1A1A' : '#2A2A2A',
                      transform: animating ? 'rotateY(720deg) scale(0.8)' : 'rotateY(0deg) scale(1)',
                      transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      boxShadow: `0 4px 20px ${currentCoin === 0 ? '#FFD70040' : '#C0C0C040'}`,
                    }}
                  >
                    {currentCoin === null ? '?' : currentCoin === 0 ? 'H' : 'T'}
                  </div>
                  <span className="text-xs mt-2 font-medium" style={{ color: '#DDDDE1' }}>
                    {currentCoin === null ? '...' : currentCoin === 0 ? 'Heads' : 'Tails'}
                  </span>
                </div>
              )}
              {showDice && (
                <div className="flex flex-col items-center">
                  <div
                    className="rounded-xl flex items-center justify-center font-bold"
                    style={{
                      width: iconSize, height: iconSize, fontSize: iconFontSize,
                      backgroundColor: '#2A2A2D',
                      color: theme.accent,
                      border: `2px solid ${theme.accent}60`,
                      transform: animating ? 'rotate(360deg) scale(0.8)' : 'rotate(0deg) scale(1)',
                      transition: 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      boxShadow: `0 4px 20px ${theme.accent}20`,
                    }}
                  >
                    {currentDice ?? '?'}
                  </div>
                  <span className="text-xs mt-2 font-medium" style={{ color: '#DDDDE1' }}>
                    {diceType.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="shrink-0 flex flex-col gap-2">
              {showCoin && coinHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: '#8E8E93', fontFamily: 'monospace', fontSize: '0.55rem' }}>HEADS vs TAILS</span>
                    <span style={{ color: '#5E5E62', fontFamily: 'monospace', fontSize: '0.55rem' }}>{heads} : {tails}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#2A2A2D' }}>
                    <div className="h-full transition-all duration-500" style={{ width: `${(heads / coinHistory.length) * 100}%`, backgroundColor: '#FFD700', minWidth: heads > 0 ? 4 : 0 }} />
                    <div className="h-full transition-all duration-500" style={{ width: `${(tails / coinHistory.length) * 100}%`, backgroundColor: '#C0C0C0', minWidth: tails > 0 ? 4 : 0 }} />
                  </div>
                </div>
              )}
              {showDice && diceHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: '#8E8E93', fontFamily: 'monospace', fontSize: '0.55rem' }}>DISTRIBUTION</span>
                    <span style={{ color: '#5E5E62', fontFamily: 'monospace', fontSize: '0.55rem' }}>
                      avg {(diceHistory.reduce((s, h) => s + h.value, 0) / diceHistory.length).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-end gap-px" style={{ height: barHeight }}>
                    {diceDist.map((count, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="w-full rounded-t transition-all duration-500" style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? 3 : 0, backgroundColor: theme.accent, opacity: count > 0 ? 0.5 + (count / maxCount) * 0.5 : 0.15 }} />
                        {maxFace <= 12 && <span className="text-center mt-0.5" style={{ color: '#5E5E62', fontFamily: 'monospace', fontSize: maxFace <= 8 ? '0.5rem' : '0.4rem' }}>{i + 1}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-center" style={{ color: '#3A3A3D', fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em' }}>
                {interval >= 60 ? `EVERY ${Math.round(interval / 60)} MIN` : `EVERY ${interval}S`}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'coin-dice',
  name: 'Coin & Dice',
  description: 'Periodic coin flips and dice rolls with daily stats and distribution chart',
  icon: 'coins',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: CoinDice,
  OptionsComponent: CoinDiceOptions,
  defaultProps: {
    mode: 'both',
    interval: 60,
    diceType: 'd6',
  },
});
