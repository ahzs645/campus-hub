'use client';

import { useState, useEffect } from 'react';
import { FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface ExchangeRateOptionsData {
  baseCurrency: string;
  cycleInterval: number;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
];

const INTERVAL_OPTIONS = [
  { value: '5', label: '5 seconds' },
  { value: '10', label: '10 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '60 seconds' },
];

export default function ExchangeRateOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<ExchangeRateOptionsData>({
    baseCurrency: (data?.baseCurrency as string) ?? 'USD',
    cycleInterval: Number(data?.cycleInterval) || 10,
  });

  useEffect(() => {
    if (data) {
      setState({
        baseCurrency: (data.baseCurrency as string) ?? 'USD',
        cycleInterval: Number(data.cycleInterval) || 10,
      });
    }
  }, [data]);

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
        <h3 className="font-semibold text-[var(--ui-text)]">Exchange Rate Settings</h3>

        <FormSelect
          label="Base Currency"
          name="baseCurrency"
          value={state.baseCurrency}
          options={CURRENCY_OPTIONS}
          onChange={handleChange}
        />

        <FormSelect
          label="Cycle Interval"
          name="cycleInterval"
          value={String(state.cycleInterval)}
          options={INTERVAL_OPTIONS}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
