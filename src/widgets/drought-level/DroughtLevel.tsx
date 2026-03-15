'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache } from '@/lib/data-cache';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import DroughtLevelOptions from './DroughtLevelOptions';

interface DroughtLevelConfig {
  basin?: string;
  displayMode?: 'single' | 'overview';
  refreshInterval?: number;
  corsProxy?: string;
}

interface DroughtFeature {
  attributes: {
    BasinName: string;
    DroughtLevel: number;
    Date_Modified: number | null;
    Comments: string | null;
  };
}

interface ArcGISResponse {
  features?: DroughtFeature[];
}

interface BasinData {
  basinName: string;
  droughtLevel: number;
  dateModified: string | null;
  comments: string | null;
}

const FEATURE_SERVER_URL =
  'https://services1.arcgis.com/xeMpV7tU1t4KD3Ei/arcgis/rest/services/British_Columbia_Drought_Levels_(Edit)_view/FeatureServer/27/query';

const droughtLevelInfo = (
  level: number
): { label: string; color: string; textColor: string } => {
  switch (level) {
    case 0:
      return { label: 'Normal', color: '#10b981', textColor: '#022c22' };
    case 1:
      return { label: 'Dry', color: '#84cc16', textColor: '#1a2e05' };
    case 2:
      return { label: 'Very Dry', color: '#eab308', textColor: '#422006' };
    case 3:
      return { label: 'Severely Dry', color: '#f97316', textColor: '#fff' };
    case 4:
      return { label: 'Extremely Dry', color: '#ef4444', textColor: '#fff' };
    case 5:
      return { label: 'Exceptionally Dry', color: '#991b1b', textColor: '#fff' };
    case 99:
      return { label: 'Off Season', color: '#6b7280', textColor: '#fff' };
    default:
      return { label: 'Unknown', color: '#6b7280', textColor: '#fff' };
  }
};

const DROUGHT_COLORS = [
  { level: 0, color: '#10b981' },
  { level: 1, color: '#84cc16' },
  { level: 2, color: '#eab308' },
  { level: 3, color: '#f97316' },
  { level: 4, color: '#ef4444' },
  { level: 5, color: '#991b1b' },
];

const MOCK_DATA: BasinData[] = [
  { basinName: 'Okanagan', droughtLevel: 3, dateModified: new Date().toISOString(), comments: null },
  { basinName: 'Nicola', droughtLevel: 2, dateModified: new Date().toISOString(), comments: null },
  { basinName: 'Lower Mainland', droughtLevel: 1, dateModified: new Date().toISOString(), comments: null },
  { basinName: 'Quesnel', droughtLevel: 0, dateModified: new Date().toISOString(), comments: null },
  { basinName: 'South Thompson', droughtLevel: 4, dateModified: new Date().toISOString(), comments: null },
];

export default function DroughtLevel({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as DroughtLevelConfig | undefined;
  const selectedBasin = cfg?.basin ?? '';
  const displayMode = cfg?.displayMode ?? 'single';
  const refreshInterval = cfg?.refreshInterval ?? 60;
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;

  const [basins, setBasins] = useState<BasinData[]>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchData = useCallback(async () => {
    if (!corsProxy) {
      setBasins(MOCK_DATA);
      return;
    }
    try {
      setError(null);
      const queryParams = new URLSearchParams({
        where: '1=1',
        outFields: 'BasinName,DroughtLevel,Date_Modified,Comments',
        returnGeometry: 'false',
        f: 'json',
      });
      const targetUrl = `${FEATURE_SERVER_URL}?${queryParams}`;
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);

      const { data: resp } = await fetchJsonWithCache<ArcGISResponse>(fetchUrl, {
        cacheKey: buildCacheKey('drought-level', 'all-basins'),
        ttlMs: refreshMs,
      });

      const features = resp?.features ?? [];
      if (features.length === 0) {
        setError('No drought data available');
        return;
      }

      const parsed: BasinData[] = features.map((f) => ({
        basinName: f.attributes.BasinName,
        droughtLevel: f.attributes.DroughtLevel,
        dateModified: f.attributes.Date_Modified
          ? new Date(f.attributes.Date_Modified).toISOString()
          : null,
        comments: f.attributes.Comments,
      }));

      parsed.sort((a, b) => a.basinName.localeCompare(b.basinName));
      setBasins(parsed);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [corsProxy, refreshMs]);

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

  const { containerRef, scale, designWidth: DESIGN_W, designHeight: DESIGN_H, isLandscape } = useAdaptiveFitScale({
    landscape: { w: 380, h: 300 },
    portrait: { w: 260, h: 400 },
  });

  // Find selected basin or highest drought level basin for single mode
  const selected = selectedBasin
    ? basins.find((b) => b.basinName === selectedBasin)
    : basins
        .filter((b) => b.droughtLevel !== 99)
        .sort((a, b) => b.droughtLevel - a.droughtLevel)[0];

  const activeDrought = basins.filter((b) => b.droughtLevel !== 99);
  const isOffSeason = activeDrought.length === 0;

  // Drought distribution for overview
  const levelCounts = [0, 0, 0, 0, 0, 0]; // levels 0-5
  for (const b of activeDrought) {
    if (b.droughtLevel >= 0 && b.droughtLevel <= 5) {
      levelCounts[b.droughtLevel]++;
    }
  }
  const maxLevel = activeDrought.length > 0
    ? Math.max(...activeDrought.map((b) => b.droughtLevel))
    : 0;

  const dateStr = selected?.dateModified
    ? new Date(selected.dateModified).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Drought icon (cracked earth / sun)
  const droughtIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-10 h-10"
    >
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      <circle cx="12" cy="12" r="5" />
    </svg>
  );

  const renderSingle = () => {
    if (!selected) {
      return (
        <div className="text-sm text-white/50 text-center">
          {isOffSeason ? 'Off season — drought levels not currently monitored' : 'No basin selected'}
        </div>
      );
    }

    const info = droughtLevelInfo(selected.droughtLevel);
    const barPosition = selected.droughtLevel <= 5
      ? (selected.droughtLevel / 5) * 100
      : 0;

    return (
      <>
        {/* Main drought display */}
        <div className={`flex ${isLandscape ? 'items-center gap-5' : 'flex-col items-center gap-3'} mb-4`}>
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: info.color, color: info.textColor }}
          >
            {droughtIcon}
          </div>
          <div className={!isLandscape ? 'text-center' : ''}>
            <div className="text-2xl font-bold text-white leading-tight">
              {info.label}
            </div>
            <div className="text-sm text-white/50 mt-0.5">
              {selected.droughtLevel <= 5 ? `Level ${selected.droughtLevel}` : 'Not monitored'}
              {' \u2022 '}
              {selected.basinName}
            </div>
          </div>
        </div>

        {/* Drought level bar */}
        {selected.droughtLevel <= 5 && (
          <div className="mb-4">
            <div className="h-2 rounded-full overflow-hidden flex">
              {DROUGHT_COLORS.map((d) => (
                <div
                  key={d.level}
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
        )}

        {/* Comments */}
        {selected.comments && (
          <div className="text-xs text-white/50 mb-2 line-clamp-2">
            {selected.comments}
          </div>
        )}

        {/* Date */}
        {dateStr && (
          <div className="text-xs text-white/40">
            Data from {dateStr}
          </div>
        )}
      </>
    );
  };

  const renderOverview = () => {
    if (isOffSeason) {
      return (
        <div className="text-sm text-white/50 text-center">
          Off season — drought levels not currently monitored
        </div>
      );
    }

    const topBasins = activeDrought
      .sort((a, b) => b.droughtLevel - a.droughtLevel)
      .slice(0, isLandscape ? 6 : 5);

    return (
      <>
        {/* Summary bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-white/40 mb-1">
            <span>Normal</span>
            <span>Exceptional</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex">
            {DROUGHT_COLORS.map((d) => (
              <div
                key={d.level}
                className="flex-1"
                style={{ backgroundColor: d.color }}
              />
            ))}
          </div>
          <div
            className="relative -mt-1"
            style={{
              left: `${(maxLevel / 5) * 100}%`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-800 mx-auto" />
          </div>
        </div>

        {/* Level distribution */}
        <div className={`flex gap-2 mb-3 ${!isLandscape ? 'justify-center' : ''}`}>
          {DROUGHT_COLORS.map((d, i) => (
            <div key={d.level} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-[10px] text-white/50">{levelCounts[i]}</span>
            </div>
          ))}
        </div>

        {/* Top basins */}
        <div className="space-y-1">
          {topBasins.map((b) => {
            const info = droughtLevelInfo(b.droughtLevel);
            return (
              <div key={b.basinName} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: info.color }}
                />
                <span className="text-white/60 truncate flex-1">{b.basinName}</span>
                <span className="text-white/40 text-xs flex-shrink-0">L{b.droughtLevel}</span>
              </div>
            );
          })}
        </div>
      </>
    );
  };

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
        className={`flex flex-col p-6 ${!isLandscape ? 'items-center' : ''}`}
      >
        {/* Header */}
        <div
          className={`text-sm font-medium opacity-70 mb-1 ${!isLandscape ? 'text-center' : ''}`}
          style={{ color: theme.accent }}
        >
          {displayMode === 'single' && selected
            ? `${selected.basinName} \u2014 Drought Level`
            : 'BC Drought Levels'}
        </div>

        {displayMode === 'single' ? renderSingle() : renderOverview()}

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

registerWidget({
  type: 'drought-level',
  name: 'Drought Level',
  description: 'BC provincial drought level by water basin',
  icon: 'cloudOff',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: DroughtLevel,
  OptionsComponent: DroughtLevelOptions,
  defaultProps: {
    basin: '',
    displayMode: 'single',
    refreshInterval: 60,
    corsProxy: '',
  },
});
