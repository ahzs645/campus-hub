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

const DESIGN_W = 340;
const DESIGN_H = 150;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

export default function ExchangeRate({ config }: WidgetComponentProps) {
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
      setVisible(false);

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
          backgroundColor: '#1B1B1D',
          borderRadius: 22,
          padding: 12,
        }}
        className="flex flex-col"
        role="region"
        aria-label="Exchange rate display"
      >
        {/* Header: red dot + EXCHANGE */}
        <div className="flex items-center gap-1.5 mb-2">
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: '#D81921',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: '#ABABAF',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            EXCHANGE
          </span>
        </div>

        {error && !rates ? (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: '#D81921', fontSize: 11 }}
          >
            Unable to load rates
          </div>
        ) : !rates ? (
          <div
            className="flex-1 rounded-2xl animate-pulse"
            style={{ backgroundColor: '#2A2A2E' }}
          />
        ) : (
          <div
            className="flex-1 flex items-stretch gap-2 transition-all duration-300 ease-in-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            {/* Left: FROM amount + currency pill */}
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              {/* Currency pill */}
              <div
                style={{
                  backgroundColor: '#0A0A0A',
                  borderRadius: 20,
                  padding: '3px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: '#5E5E62',
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  FROM
                </span>
                <span
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderRadius: 12,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#FDFBFF',
                    letterSpacing: 1,
                  }}
                >
                  {baseCurrency}
                </span>
              </div>

              {/* Large amount */}
              <span
                className="font-mono"
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#FDFBFF',
                  lineHeight: 1,
                  letterSpacing: -1,
                }}
              >
                {amount}
              </span>
            </div>

            {/* Right: White result card */}
            <div
              style={{
                backgroundColor: '#FDFBFF',
                borderRadius: 16,
                padding: '10px 14px',
                minWidth: 130,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              {/* TOTAL label */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: '#5E5E62',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                TOTAL
              </span>

              {/* Converted amount */}
              <span
                className="font-mono"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#1B1B1D',
                  lineHeight: 1,
                  letterSpacing: -0.5,
                }}
              >
                {convertedAmount}
              </span>

              {/* Target currency badge */}
              <div
                style={{
                  backgroundColor: '#1B1B1D',
                  borderRadius: 10,
                  padding: '2px 8px',
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: '#5E5E62',
                    fontWeight: 600,
                    letterSpacing: 1,
                  }}
                >
                  TO
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#FDFBFF',
                    letterSpacing: 1,
                  }}
                >
                  {targetCurrency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Currency indicator dots */}
        {currencies.length > 1 && (
          <div className="flex gap-1 mt-1.5 justify-center">
            {currencies.map((cur, i) => (
              <div
                key={cur}
                style={{
                  width: i === currentIndex ? 10 : 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor:
                    i === currentIndex ? '#D81921' : '#5E5E62',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
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
