'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchJsonWithCache, buildProxyUrl } from '@/lib/data-cache';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import AuroraForecastOptions from './AuroraForecastOptions';

interface AuroraConfig {
  refreshInterval?: number;
  corsProxy?: string;
  latitude?: number;
}

interface KpForecastRow {
  time: string;
  kp: number;
  observed: boolean;
}

interface AuroraData {
  currentKp: number;
  forecast: KpForecastRow[];
}

const KP_LEVELS: { max: number; label: string; color: string; glow: string }[] = [
  { max: 1, label: 'Quiet', color: '#6b7280', glow: '#6b728040' },
  { max: 2, label: 'Quiet', color: '#4b5563', glow: '#4b556340' },
  { max: 3, label: 'Unsettled', color: '#22c55e', glow: '#22c55e50' },
  { max: 4, label: 'Active', color: '#10b981', glow: '#10b98160' },
  { max: 5, label: 'Minor Storm', color: '#06b6d4', glow: '#06b6d460' },
  { max: 6, label: 'Moderate Storm', color: '#8b5cf6', glow: '#8b5cf660' },
  { max: 7, label: 'Strong Storm', color: '#a855f7', glow: '#a855f770' },
  { max: 8, label: 'Severe Storm', color: '#d946ef', glow: '#d946ef80' },
  { max: 9, label: 'Extreme Storm', color: '#ec4899', glow: '#ec489980' },
];

const kpLevel = (kp: number) => {
  const idx = Math.min(Math.floor(kp), 8);
  return KP_LEVELS[idx];
};

const auroraVisibility = (kp: number, latitude: number): { text: string; color: string } => {
  // Rough mapping: aurora oval reaches further south with higher Kp
  // Kp 3 → ~65°, Kp 5 → ~55°, Kp 7 → ~45°, Kp 9 → ~35°
  const visibleLat = 70 - kp * 4;
  if (latitude >= visibleLat + 8) return { text: 'Overhead', color: '#22c55e' };
  if (latitude >= visibleLat + 3) return { text: 'Clearly Visible', color: '#10b981' };
  if (latitude >= visibleLat) return { text: 'Visible on Horizon', color: '#06b6d4' };
  if (latitude >= visibleLat - 5) return { text: 'Possible', color: '#eab308' };
  return { text: 'Not Visible', color: '#6b7280' };
};

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

const parseKpForecast = (raw: unknown): AuroraData | null => {
  if (!Array.isArray(raw) || raw.length < 2) return null;

  const rows: KpForecastRow[] = [];
  // Skip header row (index 0)
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    if (!Array.isArray(row) || row.length < 3) continue;
    const kp = parseFloat(row[1]);
    if (isNaN(kp)) continue;
    rows.push({
      time: String(row[0]),
      kp,
      observed: String(row[2]) === 'observed',
    });
  }

  if (rows.length === 0) return null;

  // Current Kp is the latest observed value, or the first value
  const lastObserved = rows.filter((r) => r.observed).pop();
  const currentKp = lastObserved?.kp ?? rows[0].kp;

  return { currentKp, forecast: rows.slice(-12) }; // Last 12 entries (36 hours)
};

const MOCK_DATA: AuroraData = {
  currentKp: 4,
  forecast: [
    { time: '2024-01-01 00:00', kp: 2, observed: true },
    { time: '2024-01-01 03:00', kp: 3, observed: true },
    { time: '2024-01-01 06:00', kp: 3, observed: true },
    { time: '2024-01-01 09:00', kp: 4, observed: true },
    { time: '2024-01-01 12:00', kp: 4, observed: false },
    { time: '2024-01-01 15:00', kp: 5, observed: false },
    { time: '2024-01-01 18:00', kp: 4, observed: false },
    { time: '2024-01-01 21:00', kp: 3, observed: false },
    { time: '2024-01-02 00:00', kp: 3, observed: false },
    { time: '2024-01-02 03:00', kp: 2, observed: false },
    { time: '2024-01-02 06:00', kp: 2, observed: false },
    { time: '2024-01-02 09:00', kp: 1, observed: false },
  ],
};

// Aurora gradient colors for the background shimmer
const AURORA_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #0f172a 30%, #1e1b4b 60%, #0f172a 100%)';

export default function AuroraForecast({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as AuroraConfig | undefined;
  const refreshInterval = cfg?.refreshInterval ?? 15;
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;
  const latitude = cfg?.latitude ?? 54; // Default: Prince George, BC

  const [data, setData] = useState<AuroraData>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const fetchUrl = corsProxy ? buildProxyUrl(corsProxy, NOAA_KP_URL) : NOAA_KP_URL;
      const { data: raw } = await fetchJsonWithCache<unknown>(fetchUrl, {
        cacheKey: buildCacheKey('aurora-kp', NOAA_KP_URL),
        ttlMs: refreshMs,
      });
      const parsed = parseKpForecast(raw);
      if (parsed) {
        setData(parsed);
        setLastUpdated(new Date());
      } else {
        setError('Failed to parse aurora data');
      }
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

  const {
    containerRef,
    scale,
    designWidth: DW,
    designHeight: DH,
    isLandscape,
  } = useAdaptiveFitScale({
    landscape: { w: 380, h: 280 },
    portrait: { w: 260, h: 400 },
  });

  const level = kpLevel(data.currentKp);
  const visibility = auroraVisibility(data.currentKp, latitude);
  const maxForecastKp = Math.max(...data.forecast.map((r) => r.kp), 1);
  const barScale = Math.max(maxForecastKp, 5); // At least show scale to 5

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ background: AURORA_GRADIENT }}
    >
      <div
        style={{
          width: DW,
          height: DH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className={`flex flex-col p-6 ${!isLandscape ? 'items-center' : ''}`}
      >
        {/* Header */}
        <div
          className={`text-sm font-medium opacity-70 mb-1 tracking-wide uppercase ${
            !isLandscape ? 'text-center' : ''
          }`}
          style={{ color: '#34d399' }}
        >
          Aurora Forecast
        </div>

        {/* Main Kp display */}
        <div
          className={`flex ${
            isLandscape ? 'items-center gap-5' : 'flex-col items-center gap-3'
          } mb-4`}
        >
          {/* Kp circle */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              backgroundColor: `${level.color}20`,
              border: `2px solid ${level.color}`,
              boxShadow: `0 0 24px ${level.glow}, inset 0 0 16px ${level.glow}`,
            }}
          >
            <div>
              <div
                className="text-3xl font-bold text-center leading-none"
                style={{ color: level.color }}
              >
                {data.currentKp.toFixed(0)}
              </div>
              <div className="text-[10px] text-center text-white/50 uppercase tracking-wider">
                Kp
              </div>
            </div>
          </div>

          <div className={!isLandscape ? 'text-center' : ''}>
            <div className="text-xl font-bold text-white leading-tight">
              {level.label}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: visibility.color }}
              />
              <span className="text-sm" style={{ color: visibility.color }}>
                {visibility.text}
              </span>
            </div>
            <div className="text-xs text-white/40 mt-0.5">
              at {latitude}°N latitude
            </div>
          </div>
        </div>

        {/* Kp Scale */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full overflow-hidden flex gap-px">
            {KP_LEVELS.map((l, i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  backgroundColor:
                    i <= Math.floor(data.currentKp)
                      ? l.color
                      : `${l.color}30`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Forecast chart */}
        <div className="flex-1 min-h-0">
          <div className="text-xs text-white/40 mb-2">
            {isLandscape ? '36-Hour Forecast' : 'Forecast'}
          </div>
          <div className="flex items-end gap-1 h-16">
            {data.forecast.map((row, i) => {
              const height = Math.max(8, (row.kp / barScale) * 100);
              const rowLevel = kpLevel(row.kp);
              const hour = row.time.split(' ')[1]?.substring(0, 5) ?? '';
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${height}%`,
                      backgroundColor: row.observed
                        ? rowLevel.color
                        : `${rowLevel.color}60`,
                      boxShadow: row.kp >= 4 ? `0 0 6px ${rowLevel.glow}` : 'none',
                    }}
                  />
                  {i % 3 === 0 && (
                    <div className="text-[8px] text-white/30 mt-1 leading-none">
                      {hour}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          {error && (
            <div className="text-xs text-red-400 truncate">{error}</div>
          )}
          {lastUpdated && !error && (
            <div className="text-xs text-white/30">
              NOAA SWPC &bull;{' '}
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
          {!lastUpdated && !error && (
            <div className="text-xs text-white/30">Demo data</div>
          )}
        </div>
      </div>
    </div>
  );
}

registerWidget({
  type: 'aurora-forecast',
  name: 'Aurora Forecast',
  description: 'Northern lights visibility forecast from NOAA space weather data',
  icon: 'sparkles',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: AuroraForecast,
  OptionsComponent: AuroraForecastOptions,
  defaultProps: {
    refreshInterval: 15,
    corsProxy: '',
    latitude: 54,
  },
});
