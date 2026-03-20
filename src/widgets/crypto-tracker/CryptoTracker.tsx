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

const COIN_COLORS: Record<string, string> = {
  bitcoin: '#F7931A',
  ethereum: '#627EEA',
  binancecoin: '#F3BA2F',
  solana: '#9945FF',
  ripple: '#23292F',
  cardano: '#0033AD',
  dogecoin: '#C2A633',
  tether: '#26A17B',
};

const DEFAULT_COINS = ['bitcoin', 'ethereum', 'solana'];

function Sparkline({ prices, color }: { prices: number[]; color: string }) {
  if (!prices || prices.length < 2) return null;

  const width = 100;
  const height = 32;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 mt-1" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
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

  const { containerRef, scale } = useFitScale(240, 160);
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

  // Fetch data on mount and every 60s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Auto-cycle through coins
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

  // Reset index when coins change
  useEffect(() => {
    setActiveIndex(0);
  }, [coins.length]);

  const coin = coinData[activeIndex];
  const accentColor = coin ? COIN_COLORS[coin.id] ?? '#888' : '#888';
  const changePositive = coin ? coin.price_change_percentage_24h >= 0 : true;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 240,
          height: 160,
        }}
      >
        {!coin ? (
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-white/40 text-sm">Loading...</span>
          </div>
        ) : (
          <div
            className="flex flex-col justify-between p-4 h-full"
            style={{
              transition: 'opacity 0.3s ease-in-out',
              opacity: fadeIn ? 1 : 0,
            }}
          >
            {/* Header: logo + symbol + name */}
            <div className="flex items-center gap-2">
              <img
                src={coin.image}
                alt={coin.name}
                className="w-6 h-6 rounded-full"
                crossOrigin="anonymous"
              />
              <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                {coin.symbol}
              </span>
              <span className="text-white/40 text-xs">{coin.name}</span>
            </div>

            {/* Price */}
            <div className="mt-1">
              <span className="text-white text-2xl font-bold leading-none">
                {formatPrice(coin.current_price)}
              </span>
            </div>

            {/* 24h change */}
            <div className="flex items-center gap-1 mt-1">
              <span
                className="text-xs font-semibold"
                style={{ color: changePositive ? '#22c55e' : '#ef4444' }}
              >
                {changePositive ? '+' : ''}
                {coin.price_change_percentage_24h?.toFixed(2)}%
              </span>
              <span className="text-white/30 text-xs">24h</span>
            </div>

            {/* Sparkline */}
            {showSparkline && coin.sparkline_in_7d?.price && (
              <Sparkline prices={coin.sparkline_in_7d.price} color={accentColor} />
            )}

            {/* Dot indicators */}
            {coinData.length > 1 && (
              <div className="flex gap-1 mt-1 justify-center">
                {coinData.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor: i === activeIndex ? accentColor : 'rgba(255,255,255,0.2)',
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
