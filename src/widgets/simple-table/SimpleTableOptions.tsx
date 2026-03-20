'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface TableData {
  source: 'url' | 'manual';
  csvUrl: string;
  manualData: string;
  title: string;
  headerStyle: 'accent' | 'subtle' | 'none';
  striped: boolean;
  refreshInterval: number;
  corsProxy: string;
}

export default function SimpleTableOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<TableData>({
    source: (data?.source as 'url' | 'manual') ?? 'manual',
    csvUrl: (data?.csvUrl as string) ?? '',
    manualData: (data?.manualData as string) ?? '',
    title: (data?.title as string) ?? '',
    headerStyle: (data?.headerStyle as 'accent' | 'subtle' | 'none') ?? 'accent',
    striped: (data?.striped as boolean) ?? true,
    refreshInterval: (data?.refreshInterval as number) ?? 30,
    corsProxy: (data?.corsProxy as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        source: (data.source as 'url' | 'manual') ?? 'manual',
        csvUrl: (data.csvUrl as string) ?? '',
        manualData: (data.manualData as string) ?? '',
        title: (data.title as string) ?? '',
        headerStyle: (data.headerStyle as 'accent' | 'subtle' | 'none') ?? 'accent',
        striped: (data.striped as boolean) ?? true,
        refreshInterval: (data.refreshInterval as number) ?? 30,
        corsProxy: (data.corsProxy as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Data Source */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Data Source</h3>

        <FormSelect
          label="Source"
          name="source"
          value={state.source}
          options={[
            { value: 'manual', label: 'Manual Entry' },
            { value: 'url', label: 'CSV URL' },
          ]}
          onChange={handleChange}
        />

        {state.source === 'url' ? (
          <>
            <FormInput
              label="CSV URL"
              name="csvUrl"
              type="text"
              value={state.csvUrl}
              placeholder="https://example.com/data.csv"
              onChange={handleChange}
            />
            <div className="text-sm text-[var(--ui-text-muted)]">
              Point to a publicly accessible CSV file. The first row is used as column headers.
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[var(--ui-text-muted)]">Table Data (CSV format)</label>
              <textarea
                value={state.manualData}
                onChange={(e) => handleChange('manualData', e.target.value)}
                placeholder={'Room,Status,Hours\nLibrary 3A,Available,8am – 10pm\nStudy Room,Occupied,9am – 9pm'}
                rows={8}
                className="w-full px-3 py-2 rounded-lg bg-[var(--ui-input-bg)] text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:ring-2 outline-none transition-colors font-mono text-sm"
                style={{ border: '1px solid var(--ui-input-border)' }}
              />
            </div>
            <div className="text-sm text-[var(--ui-text-muted)]">
              Enter data in CSV format. First row becomes column headers. Use commas to separate columns.
            </div>
          </>
        )}

        <FormInput
          label="Table Title (optional)"
          name="title"
          type="text"
          value={state.title}
          placeholder="No title"
          onChange={handleChange}
        />
      </div>

      {/* Appearance */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Appearance</h3>

        <FormSelect
          label="Header Style"
          name="headerStyle"
          value={state.headerStyle}
          options={[
            { value: 'accent', label: 'Accent (bold header bar)' },
            { value: 'subtle', label: 'Subtle (light background)' },
            { value: 'none', label: 'No header styling' },
          ]}
          onChange={handleChange}
        />

        <FormSwitch
          label="Striped Rows"
          name="striped"
          checked={state.striped}
          onChange={handleChange}
        />
      </div>

      {/* Refresh (URL source only) */}
      {state.source === 'url' && (
        <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
          <h3 className="font-semibold text-[var(--ui-text)]">Refresh</h3>

          <FormSelect
            label="Auto-refresh every"
            name="refreshInterval"
            value={String(state.refreshInterval)}
            options={[
              { value: '5', label: '5 minutes' },
              { value: '15', label: '15 minutes' },
              { value: '30', label: '30 minutes' },
              { value: '60', label: '1 hour' },
            ]}
            onChange={(name, value) => handleChange(name, Number(value))}
          />

          {/* CORS Proxy */}
          <FormInput
            label="CORS Proxy (optional)"
            name="corsProxy"
            type="text"
            value={state.corsProxy}
            placeholder="Use global setting"
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  );
}
