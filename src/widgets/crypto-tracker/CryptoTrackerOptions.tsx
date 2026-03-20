'use client';

import { useState, useEffect } from 'react';
import { FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface CryptoTrackerOptionsData {
  coins: string[];
  cycleInterval: number;
  showSparkline: boolean;
}

const COIN_OPTIONS = [
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'binancecoin', label: 'BNB' },
  { id: 'solana', label: 'Solana' },
  { id: 'ripple', label: 'XRP' },
  { id: 'cardano', label: 'Cardano' },
  { id: 'dogecoin', label: 'Dogecoin' },
  { id: 'tether', label: 'Tether' },
];

const INTERVAL_OPTIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
];

const DEFAULT_COINS = ['bitcoin', 'ethereum', 'solana'];

export default function CryptoTrackerOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<CryptoTrackerOptionsData>({
    coins: (data?.coins as string[]) ?? DEFAULT_COINS,
    cycleInterval: Number(data?.cycleInterval) || 10,
    showSparkline: data?.showSparkline !== false,
  });

  useEffect(() => {
    if (data) {
      setState({
        coins: (data.coins as string[]) ?? DEFAULT_COINS,
        cycleInterval: Number(data.cycleInterval) || 10,
        showSparkline: data.showSparkline !== false,
      });
    }
  }, [data]);

  const handleCoinToggle = (coinId: string) => {
    const newCoins = state.coins.includes(coinId)
      ? state.coins.filter((c) => c !== coinId)
      : [...state.coins, coinId];
    if (newCoins.length === 0) return; // must have at least one
    const newState = { ...state, coins: newCoins };
    setState(newState);
    onChange(newState);
  };

  const handleChange = (name: string, value: string | boolean) => {
    const newState = {
      ...state,
      [name]: name === 'cycleInterval' ? Number(value) : value,
    };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Crypto Tracker Settings</h3>

        <div>
          <label className="block text-sm font-medium text-[var(--ui-text)] mb-2">
            Coins
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COIN_OPTIONS.map((coin) => (
              <label
                key={coin.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--ui-border)] cursor-pointer hover:bg-[var(--ui-hover)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={state.coins.includes(coin.id)}
                  onChange={() => handleCoinToggle(coin.id)}
                  className="rounded border-[var(--ui-border)] text-[var(--ui-accent)] focus:ring-[var(--ui-accent)]"
                />
                <span className="text-sm text-[var(--ui-text)]">{coin.label}</span>
              </label>
            ))}
          </div>
        </div>

        <FormSelect
          label="Cycle Interval"
          name="cycleInterval"
          value={String(state.cycleInterval)}
          options={INTERVAL_OPTIONS}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Sparkline"
          name="showSparkline"
          checked={state.showSparkline}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
