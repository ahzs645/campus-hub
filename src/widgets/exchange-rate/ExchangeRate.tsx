'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import ExchangeRateOptions from './ExchangeRateOptions';

interface ExchangeRateConfig {
  baseCurrency?: string;
  currencies?: string[];
  cycleInterval?: number;
  amount?: number;
}

const DESIGN_W = 280;
const DESIGN_H = 120;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

export default function ExchangeRate({ config, theme }: WidgetComponentProps) {
  const cfg = config as ExchangeRateConfig | undefined;
  const baseCurrency = cfg?.baseCurrency ?? 'USD';
  const currencies = cfg?.currencies ?? ['EUR', 'GBP', 'JPY', 'INR'];
  const cycleInterval = cfg?.cycleInterval ?? 10;
  const amount = cfg?.amount ?? 1;

  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState(false);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRates(data.rates);
      setError(false);
    } catch {
      setError(true);
    }
  }, [baseCurrency]);

  // Fetch rates on mount and every 60 minutes
  useEffect(() => {
    fetchRates();
    const timer = setInterval(fetchRates, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchRates]);

  // Auto-cycle through currencies with fade transition
  useEffect(() => {
    if (currencies.length <= 1) return;

    const timer = setInterval(() => {
      // Fade out
      setVisible(false);

      // After fade-out, switch currency and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % currencies.length);
        setVisible(true);
      }, 300);
    }, cycleInterval * 1000);

    return () => clearInterval(timer);
  }, [currencies.length, cycleInterval]);

  // Reset index when currencies change
  useEffect(() => {
    setCurrentIndex(0);
  }, [currencies.join(',')]);

  const targetCurrency = currencies[currentIndex] ?? 'EUR';
  const rate = rates?.[targetCurrency];
  const convertedAmount = rate != null ? (amount * rate).toFixed(2) : '—';

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        className="flex flex-col items-center justify-center rounded-xl px-4"
        role="region"
        aria-label="Exchange rate display"
      >
        {error && !rates ? (
          <div className="text-sm opacity-60" style={{ color: theme.accent }}>
            Unable to load rates
          </div>
        ) : !rates ? (
          <div
            className="h-8 w-40 rounded animate-pulse"
            style={{ backgroundColor: `${theme.accent}20` }}
          />
        ) : (
          <>
            {/* Rate display with transition */}
            <div
              className="flex items-baseline gap-3 transition-all duration-300 ease-in-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              {/* Base amount */}
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-mono font-bold tracking-tight tabular-nums"
                  style={{ color: theme.accent }}
                >
                  {amount}
                </span>
                <span
                  className="text-sm font-semibold uppercase tracking-wider opacity-70"
                  style={{ color: theme.accent }}
                >
                  {baseCurrency}
                </span>
              </div>

              {/* Arrow */}
              <span className="text-lg opacity-40" style={{ color: theme.accent }}>
                →
              </span>

              {/* Converted amount */}
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-3xl font-mono font-bold tracking-tight tabular-nums"
                  style={{ color: theme.accent }}
                >
                  {convertedAmount}
                </span>
                <span
                  className="text-sm font-semibold uppercase tracking-wider opacity-70"
                  style={{ color: theme.accent }}
                >
                  {targetCurrency}
                </span>
              </div>
            </div>

            {/* Currency indicator dots */}
            {currencies.length > 1 && (
              <div className="flex gap-1.5 mt-3">
                {currencies.map((cur, i) => (
                  <div
                    key={cur}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: theme.accent,
                      opacity: i === currentIndex ? 1 : 0.25,
                      transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'exchange-rate',
  name: 'Exchange Rate',
  description: 'Live currency exchange rates',
  icon: 'arrowLeftRight',
  minW: 2,
  minH: 1,
  defaultW: 3,
  defaultH: 1,
  component: ExchangeRate,
  OptionsComponent: ExchangeRateOptions,
  defaultProps: {
    baseCurrency: 'USD',
    currencies: ['EUR', 'GBP', 'JPY', 'INR'],
    cycleInterval: 10,
    amount: 1,
  },
});
