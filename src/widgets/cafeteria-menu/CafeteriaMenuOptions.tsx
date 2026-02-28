'use client';

import { useState, useEffect, useCallback } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface CafeteriaMenuData {
  menuUrl: string;
  corsProxy: string;
  refreshInterval: number;
  mealMode: string;
  breakfastEnd: string;
  lunchEnd: string;
}

const MEAL_MODES = [
  { value: 'auto', label: 'Auto (time-sensitive)' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'all', label: 'Show All' },
];

export default function CafeteriaMenuOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<CafeteriaMenuData>({
    menuUrl: (data?.menuUrl as string) ?? 'https://unbc.icaneat.ca/menu/',
    corsProxy: (data?.corsProxy as string) ?? '',
    refreshInterval: (data?.refreshInterval as number) ?? 30,
    mealMode: (data?.mealMode as string) ?? 'auto',
    breakfastEnd: (data?.breakfastEnd as string) ?? '10:30',
    lunchEnd: (data?.lunchEnd as string) ?? '14:00',
  });

  useEffect(() => {
    if (data) {
      setState({
        menuUrl: (data.menuUrl as string) ?? 'https://unbc.icaneat.ca/menu/',
        corsProxy: (data.corsProxy as string) ?? '',
        refreshInterval: (data.refreshInterval as number) ?? 30,
        mealMode: (data.mealMode as string) ?? 'auto',
        breakfastEnd: (data.breakfastEnd as string) ?? '10:30',
        lunchEnd: (data.lunchEnd as string) ?? '14:00',
      });
    }
  }, [data]);

  const propagate = useCallback(
    (newState: CafeteriaMenuData) => {
      setState(newState);
      onChange(newState as unknown as Record<string, unknown>);
    },
    [onChange]
  );

  const handleChange = (name: string, value: string | number | boolean) => {
    propagate({ ...state, [name]: value });
  };

  return (
    <div className="space-y-4">
      <FormInput
        label="Menu URL"
        name="menuUrl"
        value={state.menuUrl}
        placeholder="https://unbc.icaneat.ca/menu/"
        onChange={handleChange}
      />

      <div className="text-sm text-[var(--ui-text-muted)]">
        The URL of the cafeteria menu page. The widget will scrape the page for menu items.
        A CORS proxy is required for cross-origin requests.
      </div>

      <FormInput
        label="CORS Proxy URL"
        name="corsProxy"
        value={state.corsProxy}
        placeholder="Leave empty to use global proxy"
        onChange={handleChange}
      />

      <FormSelect
        label="Meal Display"
        name="mealMode"
        value={state.mealMode}
        options={MEAL_MODES}
        onChange={handleChange}
      />

      {state.mealMode === 'auto' && (
        <>
          <div className="text-sm text-[var(--ui-text-muted)]">
            In auto mode, the widget switches between breakfast, lunch, and dinner
            based on the current time.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Breakfast ends at"
              name="breakfastEnd"
              value={state.breakfastEnd}
              placeholder="10:30"
              onChange={handleChange}
            />
            <FormInput
              label="Lunch ends at"
              name="lunchEnd"
              value={state.lunchEnd}
              placeholder="14:00"
              onChange={handleChange}
            />
          </div>
        </>
      )}

      <FormInput
        label="Refresh Interval (minutes)"
        name="refreshInterval"
        type="number"
        value={state.refreshInterval}
        min={5}
        max={1440}
        onChange={handleChange}
      />
    </div>
  );
}
