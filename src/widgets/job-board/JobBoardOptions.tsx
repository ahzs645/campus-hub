'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface JobBoardData {
  apiUrl: string;
  sourceType: string;
  corsProxy: string;
  cacheTtlSeconds: number;
  speed: number;
  scale: number;
  label: string;
  qrUrl: string;
  qrLabel: string;
}

const SOURCE_TYPES = [
  { value: 'json', label: 'JSON API' },
  { value: 'rss', label: 'RSS Feed' },
];

const TYPE_LEGEND = [
  { type: 'Work Study', color: '#7c3aed' },
  { type: 'Part Time', color: '#0891b2' },
  { type: 'Full Time', color: '#059669' },
  { type: 'Volunteer', color: '#d97706' },
  { type: 'Co-op', color: '#2563eb' },
];

export default function JobBoardOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<JobBoardData>({
    apiUrl: (data?.apiUrl as string) ?? '',
    sourceType: (data?.sourceType as string) ?? 'json',
    corsProxy: (data?.corsProxy as string) ?? '',
    cacheTtlSeconds: (data?.cacheTtlSeconds as number) ?? 120,
    speed: (data?.speed as number) ?? 35,
    scale: (data?.scale as number) ?? 1,
    label: (data?.label as string) ?? 'Campus Jobs',
    qrUrl: (data?.qrUrl as string) ?? '',
    qrLabel: (data?.qrLabel as string) ?? 'Scan to apply',
  });

  useEffect(() => {
    if (data) {
      setState({
        apiUrl: (data.apiUrl as string) ?? '',
        sourceType: (data.sourceType as string) ?? 'json',
        corsProxy: (data.corsProxy as string) ?? '',
        cacheTtlSeconds: (data.cacheTtlSeconds as number) ?? 120,
        speed: (data.speed as number) ?? 35,
        scale: (data.scale as number) ?? 1,
        label: (data.label as string) ?? 'Campus Jobs',
        qrUrl: (data.qrUrl as string) ?? '',
        qrLabel: (data.qrLabel as string) ?? 'Scan to apply',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      {/* Data Source */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Data Source
        </h3>

        <FormInput
          label="API URL"
          name="apiUrl"
          type="text"
          value={state.apiUrl}
          placeholder="https://example.com/api/jobs.json"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          URL to a JSON API or RSS feed with job postings. Leave blank to show
          demo data. JSON should return an array of objects with{' '}
          <code className="bg-[var(--ui-item-bg)] px-1 rounded">title</code>,{' '}
          <code className="bg-[var(--ui-item-bg)] px-1 rounded">department</code>, and{' '}
          <code className="bg-[var(--ui-item-bg)] px-1 rounded">type</code> fields.
        </div>

        <FormSelect
          label="Source Type"
          name="sourceType"
          value={state.sourceType}
          options={SOURCE_TYPES}
          onChange={handleChange}
        />

        <FormInput
          label="CORS Proxy (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://corsproxy.io/?"
          onChange={handleChange}
        />
      </div>

      {/* QR Code */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          QR Code
        </h3>

        <FormInput
          label="QR Code URL"
          name="qrUrl"
          type="text"
          value={state.qrUrl}
          placeholder="https://careers.example.edu/jobs"
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          URL encoded in the QR code. Viewers can scan to see full job listings.
          Leave blank to hide the QR code.
        </div>

        <FormInput
          label="QR Label"
          name="qrLabel"
          type="text"
          value={state.qrLabel}
          placeholder="Scan to apply"
          onChange={handleChange}
        />
      </div>

      {/* Display */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">
          Display
        </h3>

        <FormInput
          label="Ticker Label"
          name="label"
          type="text"
          value={state.label}
          placeholder="Campus Jobs"
          onChange={handleChange}
        />

        <FormInput
          label="Scroll Speed (seconds per loop)"
          name="speed"
          type="number"
          value={state.speed}
          min={10}
          max={120}
          onChange={handleChange}
        />

        <FormInput
          label="Text Scale"
          name="scale"
          type="number"
          value={state.scale}
          min={0.5}
          max={2}
          onChange={handleChange}
        />

        <FormInput
          label="Cache TTL (seconds)"
          name="cacheTtlSeconds"
          type="number"
          value={state.cacheTtlSeconds}
          min={30}
          max={3600}
          onChange={handleChange}
        />
      </div>

      {/* Job type legend */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">
          Job Type Colors
        </h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4 flex flex-wrap gap-2 justify-center">
          {TYPE_LEGEND.map((t) => (
            <span
              key={t.type}
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.type}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
