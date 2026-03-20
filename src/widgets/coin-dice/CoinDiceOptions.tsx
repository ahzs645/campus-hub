'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface CoinDiceData {
  mode: string;
  interval: number;
  diceType: string;
}

export default function CoinDiceOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<CoinDiceData>(() => ({
    mode: (data?.mode as string) ?? 'both',
    interval: (data?.interval as number) ?? 60,
    diceType: (data?.diceType as string) ?? 'd6',
  }));

  useEffect(() => {
    if (data) {
      setState({
        mode: (data.mode as string) ?? 'both',
        interval: (data.interval as number) ?? 60,
        diceType: (data.diceType as string) ?? 'd6',
      });
    }
  }, [data]);

  const emit = (newState: CoinDiceData) => {
    setState(newState);
    onChange(newState as unknown as Record<string, unknown>);
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    emit({ ...state, [name]: value });
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <FormSelect
        label="Mode"
        name="mode"
        value={state.mode}
        options={[
          { value: 'both', label: 'Coin & Dice' },
          { value: 'coin', label: 'Coin flip only' },
          { value: 'dice', label: 'Dice roll only' },
        ]}
        onChange={handleChange}
      />

      {(state.mode === 'dice' || state.mode === 'both') && (
        <FormSelect
          label="Dice Type"
          name="diceType"
          value={state.diceType}
          options={[
            { value: 'd6', label: 'D6 (standard)' },
            { value: 'd8', label: 'D8' },
            { value: 'd12', label: 'D12' },
            { value: 'd20', label: 'D20' },
          ]}
          onChange={handleChange}
        />
      )}

      <FormSelect
        label="Interval"
        name="interval"
        value={String(state.interval)}
        options={[
          { value: '15', label: 'Every 15 seconds' },
          { value: '30', label: 'Every 30 seconds' },
          { value: '60', label: 'Every minute' },
          { value: '300', label: 'Every 5 minutes' },
          { value: '600', label: 'Every 10 minutes' },
          { value: '1800', label: 'Every 30 minutes' },
          { value: '3600', label: 'Every hour' },
        ]}
        onChange={(name, value) => handleChange(name, Number(value))}
      />
    </div>
  );
}
