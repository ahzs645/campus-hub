'use client';

import { useCallback, useEffect, useState } from 'react';
import AppIcon from '@/components/AppIcon';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import { buildCacheKey, buildProxyUrl, fetchTextWithCache } from '@/lib/data-cache';
import { registerWidget, type WidgetComponentProps } from '@/lib/widget-registry';
import GroupFitnessOptions from './GroupFitnessOptions';
import {
  DEFAULT_GROUP_FITNESS_URL,
  getTodayWeekday,
  parseGroupFitnessSchedule,
  type GroupFitnessSection,
  type GroupFitnessViewMode,
  type ParsedGroupFitnessSchedule,
} from './groupFitnessParser';

interface GroupFitnessConfig {
  title?: string;
  scheduleUrl?: string;
  viewMode?: GroupFitnessViewMode;
  selectedDay?: string;
  selectedClass?: string;
  refreshInterval?: number;
  corsProxy?: string;
  showSemester?: boolean;
  showInstructor?: boolean;
  showDescription?: boolean;
  maxRows?: number;
}

const formatLastModified = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const resolveDaySection = (
  schedule: ParsedGroupFitnessSchedule | null,
  selectedDay: string,
): GroupFitnessSection | null => {
  if (!schedule || schedule.byDay.length === 0) return null;
  const resolvedDay = selectedDay === 'today' ? getTodayWeekday() : selectedDay;
  return schedule.byDay.find((section) => section.title === resolvedDay) ?? schedule.byDay[0] ?? null;
};

const resolveClassSection = (
  schedule: ParsedGroupFitnessSchedule | null,
  selectedClass: string,
): GroupFitnessSection | null => {
  if (!schedule || schedule.byClass.length === 0) return null;
  if (!selectedClass) return schedule.byClass[0] ?? null;
  return schedule.byClass.find((section) => section.title === selectedClass) ?? schedule.byClass[0] ?? null;
};

const getLoadError = (error: unknown, corsProxy?: string): string => {
  if (!corsProxy) {
    return 'Could not load the schedule. Add a CORS proxy in this widget or the display settings.';
  }

  return error instanceof Error ? error.message : 'Could not load the schedule.';
};

export default function GroupFitness({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as GroupFitnessConfig | undefined;
  const title = cfg?.title?.trim() || 'Group Fitness';
  const scheduleUrl = cfg?.scheduleUrl?.trim() || DEFAULT_GROUP_FITNESS_URL;
  const viewMode = cfg?.viewMode ?? 'day';
  const selectedDay = cfg?.selectedDay ?? 'today';
  const selectedClass = cfg?.selectedClass?.trim() ?? '';
  const refreshInterval = Math.max(15, cfg?.refreshInterval ?? 60);
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;
  const showSemester = cfg?.showSemester ?? true;
  const showInstructor = cfg?.showInstructor ?? true;
  const showDescription = cfg?.showDescription ?? true;
  const maxRows = Math.max(1, cfg?.maxRows ?? 6);

  const [schedule, setSchedule] = useState<ParsedGroupFitnessSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchSchedule = useCallback(async () => {
    setLoading(true);

    try {
      const fetchUrl = buildProxyUrl(corsProxy, scheduleUrl);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('group-fitness', scheduleUrl),
        ttlMs: refreshMs,
      });

      const parsed = parseGroupFitnessSchedule(text);
      if (!parsed) {
        throw new Error('Could not parse the group fitness schedule.');
      }

      setSchedule(parsed);
      setError(null);
    } catch (fetchError) {
      setError(getLoadError(fetchError, corsProxy));
    } finally {
      setLoading(false);
    }
  }, [corsProxy, refreshMs, scheduleUrl]);

  useEffect(() => {
    void fetchSchedule();
    const interval = setInterval(() => {
      void fetchSchedule();
    }, refreshMs);
    return () => clearInterval(interval);
  }, [fetchSchedule, refreshMs]);

  const section =
    viewMode === 'class'
      ? resolveClassSection(schedule, selectedClass)
      : resolveDaySection(schedule, selectedDay);

  const visibleRows = section?.rows.slice(0, maxRows) ?? [];
  const hiddenRowCount = Math.max(0, (section?.rows.length ?? 0) - visibleRows.length);
  const lastModified = formatLastModified(schedule?.lastModified);

  const { containerRef, scale, designWidth, designHeight } = useAdaptiveFitScale({
    landscape: { w: 520, h: 320 },
    portrait: { w: 340, h: 520 },
  });

  const rowColumns =
    viewMode === 'class'
      ? showInstructor
        ? 'grid-cols-[1.05fr_1.2fr_0.95fr_0.75fr]'
        : 'grid-cols-[1.1fr_1.35fr_1fr]'
      : showInstructor
        ? 'grid-cols-[1.4fr_1.05fr_0.9fr_0.75fr]'
        : 'grid-cols-[1.5fr_1.1fr_1fr]';

  const firstColumnLabel = viewMode === 'class' ? 'Day' : 'Class';
  const emptyStateText =
    section?.description ??
    (viewMode === 'class'
      ? 'No class instances were found for this selection.'
      : 'No classes were found for this day.');

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${theme.primary}55 0%, ${theme.background} 100%)`,
      }}
    >
      <div
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-white/50">
              <AppIcon name="calendar" className="w-4 h-4" />
              <span>{viewMode === 'class' ? 'By Class' : 'By Day'}</span>
            </div>
            <div className="mt-2 text-[28px] font-semibold leading-tight text-white">{title}</div>
            <div className="mt-1 text-[18px] font-medium leading-tight" style={{ color: theme.accent }}>
              {section?.title ?? (viewMode === 'class' ? 'Choose a class' : 'Choose a day')}
            </div>
          </div>

          {showSemester && schedule && (
            <div className="shrink-0 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-right">
              <div className="text-[12px] uppercase tracking-[0.14em] text-white/45">Semester</div>
              <div className="text-[16px] font-semibold text-white">{schedule.semesterLabel}</div>
              {schedule.semesterDates && (
                <div className="text-[12px] text-white/55">{schedule.semesterDates}</div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-black/20 p-4">
          {loading && !schedule ? (
            <div className="flex h-full items-center justify-center text-center text-[15px] text-white/55">
              Loading UNBC fitness schedule...
            </div>
          ) : error && !schedule ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <AppIcon name="calendar" className="mb-3 h-10 w-10 text-white/30" />
              <div className="max-w-[340px] text-[15px] leading-relaxed text-red-200">{error}</div>
            </div>
          ) : section ? (
            <div className="flex h-full flex-col">
              <div
                className={`grid ${rowColumns} gap-3 border-b border-white/10 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45`}
              >
                <div>{firstColumnLabel}</div>
                <div>Time</div>
                <div>Location</div>
                {showInstructor && <div>Instructor</div>}
              </div>

              {visibleRows.length > 0 ? (
                <div className="flex-1 divide-y divide-white/8 overflow-hidden">
                  {visibleRows.map((row, index) => (
                    <div key={`${section.title}-${index}`} className={`grid ${rowColumns} gap-3 py-3`}>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] font-medium text-white">
                          {viewMode === 'class' ? row.day || 'TBA' : row.className || 'TBA'}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[15px] text-white/85">{row.time || 'TBA'}</div>
                        {row.note && (
                          <div className="mt-0.5 truncate text-[11px] italic text-white/45">{row.note}</div>
                        )}
                      </div>

                      <div className="truncate text-[15px] text-white/70">{row.location || 'TBA'}</div>

                      {showInstructor && (
                        <div className="truncate text-[15px] text-white/70">{row.instructor || 'TBA'}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center">
                  <div className="max-w-[360px] text-[15px] leading-relaxed text-white/65">{emptyStateText}</div>
                </div>
              )}

              {viewMode === 'class' && showDescription && section.description && visibleRows.length > 0 && (
                <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[12px] leading-relaxed text-white/60 line-clamp-3">
                  {section.description}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-[15px] text-white/55">
              No schedule data was found.
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-white/45">
          <div className="min-w-0 truncate">
            {error && schedule
              ? error
              : hiddenRowCount > 0
                ? `+${hiddenRowCount} more ${viewMode === 'class' ? 'times' : 'classes'} not shown`
                : schedule?.closureNote || 'UNBC Northern Sport Centre'}
          </div>
          {lastModified && <div className="shrink-0">Updated {lastModified}</div>}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'group-fitness',
  name: 'Group Fitness',
  description: 'UNBC Northern Sport Centre drop-in fitness schedule by day or by class',
  icon: 'calendar',
  minW: 4,
  minH: 3,
  defaultW: 5,
  defaultH: 4,
  component: GroupFitness,
  OptionsComponent: GroupFitnessOptions,
  defaultProps: {
    title: 'Group Fitness',
    scheduleUrl: DEFAULT_GROUP_FITNESS_URL,
    viewMode: 'day',
    selectedDay: 'today',
    selectedClass: '',
    refreshInterval: 60,
    corsProxy: '',
    showSemester: true,
    showInstructor: true,
    showDescription: true,
    maxRows: 6,
  },
});
