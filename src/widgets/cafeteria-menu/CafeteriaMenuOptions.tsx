'use client';

import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface CafeteriaData {
  menuUrl: string;
  danaLocations: string;
  refreshInterval: number;
  corsProxy: string;
  weekdayBreakfastStart: string;
  weekdayBreakfastEnd: string;
  weekdayLunchStart: string;
  weekdayLunchEnd: string;
  weekdayDinnerStart: string;
  weekdayDinnerEnd: string;
  weekendBreakfastStart: string;
  weekendBreakfastEnd: string;
  weekendLunchStart: string;
  weekendLunchEnd: string;
  weekendDinnerStart: string;
  weekendDinnerEnd: string;
}

export default function CafeteriaMenuOptions({ data, onChange }: WidgetOptionsProps) {
  const legacyBreakfastEnd = (data?.breakfastEnd as string) ?? '10:45';
  const legacyLunchEnd = (data?.lunchEnd as string) ?? '15:45';
  const legacyDinnerEnd = (data?.dinnerEnd as string) ?? '23:00';

  const state: CafeteriaData = {
    menuUrl: (data?.menuUrl as string) ?? 'https://unbc.icaneat.ca/menu/',
    danaLocations: (data?.danaLocations as string) ?? '48784',
    refreshInterval: (data?.refreshInterval as number) ?? 30,
    corsProxy: (data?.corsProxy as string) ?? '',
    weekdayBreakfastStart: (data?.weekdayBreakfastStart as string) ?? '07:00',
    weekdayBreakfastEnd: (data?.weekdayBreakfastEnd as string) ?? legacyBreakfastEnd,
    weekdayLunchStart: (data?.weekdayLunchStart as string) ?? '11:00',
    weekdayLunchEnd: (data?.weekdayLunchEnd as string) ?? legacyLunchEnd,
    weekdayDinnerStart: (data?.weekdayDinnerStart as string) ?? '16:00',
    weekdayDinnerEnd: (data?.weekdayDinnerEnd as string) ?? legacyDinnerEnd,
    weekendBreakfastStart: (data?.weekendBreakfastStart as string) ?? '08:00',
    weekendBreakfastEnd: (data?.weekendBreakfastEnd as string) ?? legacyBreakfastEnd,
    weekendLunchStart: (data?.weekendLunchStart as string) ?? '11:00',
    weekendLunchEnd: (data?.weekendLunchEnd as string) ?? legacyLunchEnd,
    weekendDinnerStart: (data?.weekendDinnerStart as string) ?? '16:00',
    weekendDinnerEnd: (data?.weekendDinnerEnd as string) ?? '22:00',
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    onChange({ ...state, [name]: value });
  };

  return (
    <div className="space-y-6">
      {/* Menu Source */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Menu Source</h3>

        <FormInput
          label="Menu Page URL"
          name="menuUrl"
          type="text"
          value={state.menuUrl}
          placeholder="https://unbc.icaneat.ca/menu/"
          onChange={handleChange}
        />

        <FormInput
          label="Dana Hospitality Location IDs"
          name="danaLocations"
          type="text"
          value={state.danaLocations}
          placeholder="48784"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          The widget tries three sources in order: (1) Dana Hospitality weekly
          grid using location IDs above, (2) WordPress API discovery from the
          menu URL, (3) generic HTML parsing. Leave location IDs blank to skip
          direct Dana endpoints.
        </div>
      </div>

      {/* Meal Time Windows */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Service Hours</h3>

        <div className="text-sm text-[var(--ui-text-muted)] mb-2">
          These default to UNBC drop-in meal service windows and can be edited.
        </div>

        <div className="space-y-3 rounded-lg border border-[color:var(--ui-item-border)] p-3">
          <h4 className="text-sm font-medium text-[var(--ui-text)]">Monday to Friday</h4>
          <FormInput label="Breakfast start" name="weekdayBreakfastStart" type="time" value={state.weekdayBreakfastStart} onChange={handleChange} />
          <FormInput label="Breakfast end" name="weekdayBreakfastEnd" type="time" value={state.weekdayBreakfastEnd} onChange={handleChange} />
          <FormInput label="Lunch start" name="weekdayLunchStart" type="time" value={state.weekdayLunchStart} onChange={handleChange} />
          <FormInput label="Lunch end" name="weekdayLunchEnd" type="time" value={state.weekdayLunchEnd} onChange={handleChange} />
          <FormInput label="Dinner start" name="weekdayDinnerStart" type="time" value={state.weekdayDinnerStart} onChange={handleChange} />
          <FormInput label="Dinner end" name="weekdayDinnerEnd" type="time" value={state.weekdayDinnerEnd} onChange={handleChange} />
        </div>

        <div className="space-y-3 rounded-lg border border-[color:var(--ui-item-border)] p-3">
          <h4 className="text-sm font-medium text-[var(--ui-text)]">Weekends and Holidays</h4>
          <FormInput label="Breakfast start" name="weekendBreakfastStart" type="time" value={state.weekendBreakfastStart} onChange={handleChange} />
          <FormInput label="Breakfast end" name="weekendBreakfastEnd" type="time" value={state.weekendBreakfastEnd} onChange={handleChange} />
          <FormInput label="Lunch start" name="weekendLunchStart" type="time" value={state.weekendLunchStart} onChange={handleChange} />
          <FormInput label="Lunch end" name="weekendLunchEnd" type="time" value={state.weekendLunchEnd} onChange={handleChange} />
          <FormInput label="Dinner start" name="weekendDinnerStart" type="time" value={state.weekendDinnerStart} onChange={handleChange} />
          <FormInput label="Dinner end" name="weekendDinnerEnd" type="time" value={state.weekendDinnerEnd} onChange={handleChange} />
        </div>
      </div>

      {/* Refresh Interval */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Refresh Interval</h3>

        <FormSelect
          label="Auto-refresh every"
          name="refreshInterval"
          value={String(state.refreshInterval)}
          options={[
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '120', label: '2 hours' },
            { value: '360', label: '6 hours' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />
      </div>

      {/* CORS Proxy */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">CORS Proxy</h3>

        <FormInput
          label="CORS Proxy URL (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="Leave blank to use global setting"
          onChange={handleChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          A CORS proxy is required to fetch menu data from the browser. Without
          it, demo data is shown.
        </div>
      </div>
    </div>
  );
}
