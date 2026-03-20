'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
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

const CHART_WIDTH = 134;
const CHART_HEIGHT = 50;

function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (!prices || prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * CHART_WIDTH;
      const y = CHART_HEIGHT - ((p - min) / range) * CHART_HEIGHT;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = positive ? '#4CAF50' : '#D81921';

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      className="absolute inset-0 m-auto"
      preserveAspectRatio="none"
      style={{ opacity: 0.25 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

export default function CryptoTracker({ config }: WidgetComponentProps) {
  const trackerConfig = config as CryptoTrackerConfig | undefined;
  const coins = trackerConfig?.coins ?? DEFAULT_COINS;
  const cycleInterval = trackerConfig?.cycleInterval ?? 10;
  const showSparkline = trackerConfig?.showSparkline ?? true;

  const { containerRef, scale } = useFitScale(240, 200);
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        backgroundColor: '#1B1B1D',
        borderRadius: 22,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 240,
          height: 200,
          padding: 16,
        }}
      >
        {!coin ? (
          <div className="flex items-center justify-center w-full h-full">
            <span style={{ color: '#ABABAF', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500 }}>
              Loading...
            </span>
          </div>
        ) : (
          <div
            className="flex flex-col h-full"
            style={{
              transition: 'opacity 0.3s ease-in-out',
              opacity: fadeIn ? 1 : 0,
            }}
          >
            {/* Coin logo + symbol + name */}
            <div className="flex items-center gap-2">
              <img
                src={coin.image}
                alt={coin.name}
                width={36}
                height={36}
                className="rounded-full"
                style={{ width: 36, height: 36 }}
                crossOrigin="anonymous"
              />
              <div className="flex flex-col">
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                  }}
                >
                  {coin.symbol}
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#ABABAF',
                    lineHeight: 1.2,
                  }}
                >
                  {coin.name}
                </span>
              </div>
            </div>

            {/* Price area with sparkline behind */}
            <div className="relative flex-1 flex items-center justify-center" style={{ marginTop: 8 }}>
              {showSparkline && coin.sparkline_in_7d?.price && (
                <Sparkline prices={coin.sparkline_in_7d.price} positive={changePositive} />
              )}
              <span
                className="font-mono text-2xl font-bold tracking-tight"
                style={{
                  color: '#FFFFFF',
                  lineHeight: 1,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {formatPrice(coin.current_price)}
              </span>
            </div>

            {/* 24h change */}
            <div className="flex justify-center" style={{ marginTop: 4 }}>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
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
