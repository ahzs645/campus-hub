'use client';

import { useEffect, useRef, useState } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import { buildProxyUrl } from '@/lib/data-cache';
import type { WidgetOptionsProps } from '@/lib/widget-registry';
import {
  DEFAULT_GROUP_FITNESS_URL,
  WEEKDAY_NAMES,
  getTodayWeekday,
  parseGroupFitnessSchedule,
  type GroupFitnessSection,
  type GroupFitnessViewMode,
  type ParsedGroupFitnessSchedule,
} from './groupFitnessParser';

interface GroupFitnessOptionsData {
  title: string;
  scheduleUrl: string;
  viewMode: GroupFitnessViewMode;
  selectedDay: string;
  selectedClass: string;
  refreshInterval: number;
  corsProxy: string;
  showSemester: boolean;
  showInstructor: boolean;
  showDescription: boolean;
  maxRows: number;
}

const getInitialState = (data: Record<string, unknown>): GroupFitnessOptionsData => ({
  title: (data.title as string) ?? 'Group Fitness',
  scheduleUrl: (data.scheduleUrl as string) ?? DEFAULT_GROUP_FITNESS_URL,
  viewMode: (data.viewMode as GroupFitnessViewMode) ?? 'day',
  selectedDay: (data.selectedDay as string) ?? 'today',
  selectedClass: (data.selectedClass as string) ?? '',
  refreshInterval: (data.refreshInterval as number) ?? 60,
  corsProxy: (data.corsProxy as string) ?? '',
  showSemester: (data.showSemester as boolean) ?? true,
  showInstructor: (data.showInstructor as boolean) ?? true,
  showDescription: (data.showDescription as boolean) ?? true,
  maxRows: (data.maxRows as number) ?? 6,
});

const resolvePreviewSection = (
  schedule: ParsedGroupFitnessSchedule | null,
  viewMode: GroupFitnessViewMode,
  selectedDay: string,
  selectedClass: string,
): GroupFitnessSection | null => {
  if (!schedule) return null;

  if (viewMode === 'class') {
    if (!selectedClass) return schedule.byClass[0] ?? null;
    return schedule.byClass.find((section) => section.title === selectedClass) ?? schedule.byClass[0] ?? null;
  }

  const resolvedDay = selectedDay === 'today' ? getTodayWeekday() : selectedDay;
  return schedule.byDay.find((section) => section.title === resolvedDay) ?? schedule.byDay[0] ?? null;
};

export default function GroupFitnessOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<GroupFitnessOptionsData>(getInitialState(data));
  const [scheduleInfo, setScheduleInfo] = useState<ParsedGroupFitnessSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const fetchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setState(getInitialState(data));
  }, [data]);

  useEffect(() => {
    if (!state.scheduleUrl.trim()) {
      setScheduleInfo(null);
      setLoadError('');
      return;
    }

    const timeout = setTimeout(() => {
      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      setLoading(true);
      setLoadError('');

      const fetchUrl = buildProxyUrl(state.corsProxy.trim(), state.scheduleUrl.trim());

      fetch(fetchUrl, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response.text();
        })
        .then((html) => {
          const parsed = parseGroupFitnessSchedule(html);
          if (!parsed) {
            throw new Error('Could not parse the schedule.');
          }
          setScheduleInfo(parsed);
        })
        .catch((error: unknown) => {
          if ((error as { name?: string }).name === 'AbortError') return;
          setScheduleInfo(null);
          setLoadError(
            state.corsProxy.trim()
              ? 'Could not load classes from the schedule URL.'
              : 'Add a CORS proxy to load days and classes from UNBC.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 500);

    return () => {
      clearTimeout(timeout);
      fetchControllerRef.current?.abort();
    };
  }, [state.scheduleUrl, state.corsProxy]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const nextState = { ...state, [name]: value };
    setState(nextState);
    onChange(nextState);
  };

  const availableClasses = Array.from(
    new Set((scheduleInfo?.byClass ?? []).map((section) => section.title).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const classOptions = [
    {
      value: '',
      label: scheduleInfo?.byClass[0]?.title
        ? `Auto (${scheduleInfo.byClass[0].title})`
        : 'Auto (first class)',
    },
    ...availableClasses.map((name) => ({ value: name, label: name })),
  ];

  if (state.selectedClass && !availableClasses.includes(state.selectedClass)) {
    classOptions.push({ value: state.selectedClass, label: `${state.selectedClass} (current)` });
  }

  const previewSection = resolvePreviewSection(
    scheduleInfo,
    state.viewMode,
    state.selectedDay,
    state.selectedClass,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display</h3>

        <FormInput
          label="Widget Title"
          name="title"
          type="text"
          value={state.title}
          placeholder="Group Fitness"
          onChange={handleChange}
        />

        <FormSelect
          label="Schedule View"
          name="viewMode"
          value={state.viewMode}
          options={[
            { value: 'day', label: 'Schedule by day' },
            { value: 'class', label: 'Schedule by class' },
          ]}
          onChange={handleChange}
        />

        {state.viewMode === 'day' ? (
          <FormSelect
            label="Day"
            name="selectedDay"
            value={state.selectedDay}
            options={[
              { value: 'today', label: 'Auto (today)' },
              ...WEEKDAY_NAMES.map((day) => ({ value: day, label: day })),
            ]}
            onChange={handleChange}
          />
        ) : (
          <FormSelect
            label="Class"
            name="selectedClass"
            value={state.selectedClass}
            options={classOptions}
            onChange={handleChange}
          />
        )}

        <FormSelect
          label="Maximum Rows"
          name="maxRows"
          value={String(state.maxRows)}
          options={[
            { value: '3', label: '3 rows' },
            { value: '4', label: '4 rows' },
            { value: '5', label: '5 rows' },
            { value: '6', label: '6 rows' },
            { value: '7', label: '7 rows' },
            { value: '8', label: '8 rows' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <FormSwitch
          label="Show Semester"
          name="showSemester"
          checked={state.showSemester}
          onChange={handleChange}
        />

        <FormSwitch
          label="Show Instructor"
          name="showInstructor"
          checked={state.showInstructor}
          onChange={handleChange}
        />

        {state.viewMode === 'class' && (
          <FormSwitch
            label="Show Class Description"
            name="showDescription"
            checked={state.showDescription}
            onChange={handleChange}
          />
        )}
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Data Source</h3>

        <FormInput
          label="Schedule URL"
          name="scheduleUrl"
          type="url"
          value={state.scheduleUrl}
          placeholder={DEFAULT_GROUP_FITNESS_URL}
          onChange={handleChange}
        />

        <FormInput
          label="CORS Proxy"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://your-proxy.example.com"
          onChange={handleChange}
        />

        <FormSelect
          label="Refresh Every"
          name="refreshInterval"
          value={String(state.refreshInterval)}
          options={[
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '180', label: '3 hours' },
            { value: '360', label: '6 hours' },
            { value: '720', label: '12 hours' },
          ]}
          onChange={(name, value) => handleChange(name, Number(value))}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          This page is on `unbc.ca`, so a proxy is usually required to fetch it from the browser.
        </div>
      </div>

      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="mb-4 font-semibold text-[var(--ui-text)]">Preview</h4>

        <div className="rounded-xl bg-[var(--ui-item-bg)] p-4">
          {scheduleInfo ? (
            <>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-accent)]">
                {scheduleInfo.semesterLabel}
              </div>
              {scheduleInfo.semesterDates && (
                <div className="mt-1 text-xs text-[var(--ui-text-muted)]">{scheduleInfo.semesterDates}</div>
              )}

              <div className="mt-3 text-lg font-semibold text-[var(--ui-text)]">
                {previewSection?.title ?? 'No section selected'}
              </div>

              <div className="mt-3 space-y-2 text-sm text-[var(--ui-text-muted)]">
                {(previewSection?.rows ?? []).slice(0, 3).map((row, index) => (
                  <div key={`${previewSection?.title}-${index}`} className="rounded-lg bg-black/10 px-3 py-2">
                    <div className="font-medium text-[var(--ui-text)]">
                      {state.viewMode === 'class' ? row.day || 'TBA' : row.className || 'TBA'}
                    </div>
                    <div className="mt-0.5">
                      {[row.time, row.location, row.instructor].filter(Boolean).join(' | ')}
                    </div>
                    {row.note && <div className="mt-0.5 italic">{row.note}</div>}
                  </div>
                ))}
              </div>

              {previewSection?.rows.length === 0 && previewSection?.description && (
                <div className="mt-3 text-sm leading-relaxed text-[var(--ui-text-muted)]">
                  {previewSection.description}
                </div>
              )}

              <div className="mt-4 text-xs text-[var(--ui-text-muted)]">
                Parsed {scheduleInfo.byDay.length} days and {scheduleInfo.byClass.length} classes.
              </div>
            </>
          ) : (
            <div className="text-sm text-[var(--ui-text-muted)]">
              {loading
                ? 'Loading schedule preview...'
                : loadError || 'Schedule details will appear here once the page loads.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
