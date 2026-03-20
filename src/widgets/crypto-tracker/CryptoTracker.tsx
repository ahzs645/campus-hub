'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import { DotMatrixText, textToChars } from '@/lib/dot-matrix';
import CryptoTrackerOptions from './CryptoTrackerOptions';

interface CryptoTrackerConfig {
  coins?: string[];
  cycleInterval?: number;
  showSparkline?: boolean;
}

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}

const DEFAULT_COINS = ['bitcoin', 'ethereum', 'solana'];

const CHART_WIDTH = 180;
const CHART_HEIGHT = 60;

function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (!prices || prices.length < 2) return null;

  const pts = prices.slice(-48);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const points = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((p - min) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      preserveAspectRatio="none"
      style={{ opacity: 0.3 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#4CAF50' : '#D81921'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${Math.round(price).toLocaleString('en-US')}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

export default function CryptoTracker({ config }: WidgetComponentProps) {
  const trackerConfig = config as CryptoTrackerConfig | undefined;
  const coins = trackerConfig?.coins ?? DEFAULT_COINS;
  const cycleInterval = trackerConfig?.cycleInterval ?? 10;
  const showSparkline = trackerConfig?.showSparkline ?? true;

  const { containerRef, scale } = useFitScale(220, 200);
  const [coinData, setCoinData] = useState<CoinData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const fetchData = useCallback(async () => {
    if (coins.length === 0) return;
    try {
      const ids = coins.join(',');
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&sparkline=true`,
      );
      if (!res.ok) return;
      const data: CoinData[] = await res.json();
      setCoinData(data);
    } catch {
      // silently fail
    }
  }, [coins]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (coinData.length <= 1) return;
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % coinData.length);
        setFadeIn(true);
      }, 300);
    }, cycleInterval * 1000);
    return () => clearInterval(interval);
  }, [coinData.length, cycleInterval]);

  useEffect(() => {
    setActiveIndex(0);
  }, [coins.length]);

  const coin = coinData[activeIndex];
  const changePositive = coin ? coin.price_change_percentage_24h >= 0 : true;

  // Dot-matrix price chars
  const priceChars = useMemo(() => {
    if (!coin) return [];
    return textToChars(formatPrice(coin.current_price), '#FDFBFF');
  }, [coin]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22 }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 220,
          height: 200,
          padding: 16,
        }}
      >
        {!coin ? (
          <div className="flex items-center justify-center w-full h-full">
            <span style={{ color: '#5E5E62', fontSize: 12 }}>Loading...</span>
          </div>
        ) : (
          <div
            className="flex flex-col h-full"
            style={{ transition: 'opacity 0.3s', opacity: fadeIn ? 1 : 0 }}
          >
            {/* Symbol + name at top right */}
            <div className="flex flex-col items-end">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#FDFBFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: 1.2,
                }}
              >
                {coin.symbol.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#ABABAF',
                  lineHeight: 1.2,
                }}
              >
                {coin.name}
              </span>
            </div>

            {/* Price area: sparkline behind, dot-matrix price on top */}
            <div className="relative flex-1 flex items-center justify-center" style={{ marginTop: 4 }}>
              {/* Sparkline behind */}
              {showSparkline && coin.sparkline_in_7d?.price && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkline prices={coin.sparkline_in_7d.price} positive={changePositive} />
                </div>
              )}
              {/* Dot-matrix price */}
              <div className="relative z-10">
                <DotMatrixText
                  chars={priceChars}
                  dotSize={3}
                  gap={1}
                  emptyColor="#2A2A2E"
                  showEmpty
                />
              </div>
            </div>

            {/* 24h change */}
            <div className="flex justify-start" style={{ marginTop: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: changePositive ? '#4CAF50' : '#D81921',
                }}
              >
                {changePositive ? '+' : ''}
                {coin.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </div>

            {/* Pagination dots */}
            {coinData.length > 1 && (
              <div className="flex justify-center" style={{ marginTop: 8, gap: 6 }}>
                {coinData.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-colors duration-300"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: i === activeIndex ? '#FDFBFF' : '#5E5E62',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'crypto-tracker',
  name: 'Crypto Tracker',
  description: 'Live cryptocurrency prices',
  icon: 'coins',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: CryptoTracker,
  OptionsComponent: CryptoTrackerOptions,
  defaultProps: {
    coins: ['bitcoin', 'ethereum', 'solana'],
    cycleInterval: 10,
    showSparkline: true,
  },
});
