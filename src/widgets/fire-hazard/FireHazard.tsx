'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import FireHazardOptions from './FireHazardOptions';

interface FireHazardConfig {
  fireCentre?: string;
  refreshInterval?: number;
  corsProxy?: string;
}

interface DangerData {
  dangerClass: number;
  label: string;
  color: string;
  textColor: string;
  stationCount: number;
  stations: { name: string; dangerClass: number }[];
  fireCentre: string;
}

const FIRE_CENTRES = [
  'Cariboo Fire Centre',
  'Coastal Fire Centre',
  'Kamloops Fire Centre',
  'Northwest Fire Centre',
  'Prince George Fire Centre',
  'Southeast Fire Centre',
];

const dangerLevel = (
  cls: number
): { label: string; color: string; textColor: string } => {
  switch (cls) {
    case 1:
      return { label: 'Low', color: '#22c55e', textColor: '#052e16' };
    case 2:
      return { label: 'Moderate', color: '#3b82f6', textColor: '#eff6ff' };
    case 3:
      return { label: 'High', color: '#eab308', textColor: '#422006' };
    case 4:
      return { label: 'Very High', color: '#f97316', textColor: '#fff' };
    case 5:
      return { label: 'Extreme', color: '#ef4444', textColor: '#fff' };
    default:
      return { label: 'Unknown', color: '#6b7280', textColor: '#fff' };
  }
};

const DANGER_COLORS = [
  { cls: 1, color: '#22c55e' },
  { cls: 2, color: '#3b82f6' },
  { cls: 3, color: '#eab308' },
  { cls: 4, color: '#f97316' },
  { cls: 5, color: '#ef4444' },
];

const BASE_URL =
  'https://wfapps.nrs.gov.bc.ca/pub/wfwx-danger-summary-war/dangerSummary';

const buildApiUrl = (fireCentre: string): string =>
  `${BASE_URL}?fireCentre=${encodeURIComponent(fireCentre)}`;

/**
 * Parse the BC Wildfire danger summary HTML page.
 * The page renders a table with weather station rows and danger class columns.
 * We look for table rows containing danger class numbers (1–5).
 */
const parseDangerHtml = (html: string, fireCentre: string): DangerData | null => {
  const stations: { name: string; dangerClass: number }[] = [];

  // Match table rows — each station row typically has the station name and a
  // danger class value (1-5). We try multiple patterns to be resilient to
  // minor HTML changes.
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    // Extract all <td> cell contents
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
    }
    if (cells.length < 2) continue;

    // Look for a cell that is a danger class number (1-5)
    // Typically the last meaningful numeric cell is the danger class
    const stationName = cells[0];
    if (!stationName || /^\d+$/.test(stationName)) continue;

    // Find the danger class — scan cells from the end for a 1-5 value
    let dc = 0;
    for (let i = cells.length - 1; i >= 1; i--) {
      const val = parseInt(cells[i], 10);
      if (val >= 1 && val <= 5) {
        dc = val;
        break;
      }
    }
    if (dc === 0) continue;

    stations.push({ name: stationName, dangerClass: dc });
  }

  if (stations.length === 0) {
    // Fallback: look for any danger class mentions in the page
    const classMatches = html.match(/(?:danger\s*class|class)\s*[:=]?\s*([1-5])/gi);
    if (classMatches) {
      for (const m of classMatches) {
        const val = parseInt(m.replace(/\D/g, ''), 10);
        if (val >= 1 && val <= 5) {
          stations.push({ name: 'Station', dangerClass: val });
        }
      }
    }
  }

  if (stations.length === 0) return null;

  // Use the most common (mode) danger class as the representative value
  const counts = [0, 0, 0, 0, 0, 0]; // index 0 unused, 1-5
  for (const s of stations) counts[s.dangerClass]++;
  let modeDc = 1;
  let modeCount = 0;
  for (let i = 1; i <= 5; i++) {
    if (counts[i] > modeCount) {
      modeCount = counts[i];
      modeDc = i;
    }
  }

  const level = dangerLevel(modeDc);
  return {
    dangerClass: modeDc,
    ...level,
    stationCount: stations.length,
    stations,
    fireCentre,
  };
};

const MOCK_DATA: DangerData = {
  dangerClass: 3,
  label: 'High',
  color: '#eab308',
  textColor: '#422006',
  stationCount: 12,
  stations: [
    { name: 'Quesnel', dangerClass: 3 },
    { name: 'Williams Lake', dangerClass: 4 },
    { name: '100 Mile House', dangerClass: 3 },
  ],
  fireCentre: 'Cariboo Fire Centre',
};

export default function FireHazard({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as FireHazardConfig | undefined;
  const fireCentre = cfg?.fireCentre ?? FIRE_CENTRES[0];
  const refreshInterval = cfg?.refreshInterval ?? 30;
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;

  const [data, setData] = useState<DangerData>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchData = useCallback(async () => {
    if (!corsProxy) {
      setData({ ...MOCK_DATA, fireCentre });
      return;
    }
    try {
      setError(null);
      const targetUrl = buildApiUrl(fireCentre);
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('fire-hazard', fireCentre),
        ttlMs: refreshMs,
      });
      const parsed = parseDangerHtml(text, fireCentre);
      if (parsed) {
        setData(parsed);
        setLastUpdated(new Date());
      } else {
        setError('Failed to parse fire danger data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [corsProxy, fireCentre, refreshMs]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!isMounted) return;
      await fetchData();
    };
    run();
    const interval = setInterval(run, refreshMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchData, refreshMs]);

  const DESIGN_W = 340;
  const DESIGN_H = 280;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  // Flame icon paths (inline SVG for the main display)
  const flameIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-10 h-10"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );

  // Position marker on the danger bar (1-5 scale → 0-100%)
  const barPosition = ((data.dangerClass - 1) / 4) * 100;

  // Short label for fire centre display
  const centreShort = fireCentre.replace(' Fire Centre', '');

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col p-6"
      >
        {/* Header */}
        <div
          className="text-sm font-medium opacity-70 mb-1"
          style={{ color: theme.accent }}
        >
          {centreShort} &mdash; Fire Danger
        </div>

        {/* Main danger display */}
        <div className="flex items-center gap-5 mb-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: data.color, color: data.textColor }}
          >
            {flameIcon}
          </div>
          <div>
            <div className="text-2xl font-bold text-white leading-tight">
              {data.label}
            </div>
            <div className="text-sm text-white/50 mt-0.5">
              Danger Class {data.dangerClass} &bull; {data.stationCount} station
              {data.stationCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Danger bar */}
        <div className="mb-4">
          <div className="h-2 rounded-full overflow-hidden flex">
            {DANGER_COLORS.map((d) => (
              <div
                key={d.cls}
                className="flex-1"
                style={{ backgroundColor: d.color }}
              />
            ))}
          </div>
          <div
            className="relative -mt-1"
            style={{
              left: `${Math.min(100, barPosition)}%`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-800 mx-auto" />
          </div>
        </div>

        {/* Station breakdown (top 3) */}
        {data.stations.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            {data.stations.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: dangerLevel(s.dangerClass).color }}
                />
                <span className="font-medium text-white/40">{s.name}</span>
                <span>{s.dangerClass}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 text-sm text-red-400 truncate">{error}</div>
        )}

        {/* Last updated */}
        {lastUpdated && !error && (
          <div className="mt-auto text-sm text-white/40">
            Updated{' '}
            {lastUpdated.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'fire-hazard',
  name: 'Fire Hazard Rating',
  description: 'BC Wildfire danger class rating by fire centre',
  icon: 'flame',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: FireHazard,
  OptionsComponent: FireHazardOptions,
  defaultProps: {
    fireCentre: 'Cariboo Fire Centre',
    refreshInterval: 30,
    corsProxy: '',
  },
});
