'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchJsonWithCache } from '@/lib/data-cache';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import UvIndexOptions from './UvIndexOptions';

interface UvIndexConfig {
  dataSource?: 'openuv' | 'waqi';
  openUvApiKey?: string;
  latitude?: number;
  longitude?: number;
  waqiToken?: string;
  waqiCity?: string;
  refreshInterval?: number;
}

interface UvData {
  value: number;
  label: string;
  color: string;
  textColor: string;
  advice: string;
  maxUv?: number;
  maxUvTime?: string;
}

// OpenUV API response
interface OpenUvResponse {
  result?: {
    uv?: number;
    uv_max?: number;
    uv_max_time?: string;
  };
}

// WAQI response (reused pattern)
interface WaqiUvResponse {
  status?: string;
  data?: {
    aqi?: number;
    iaqi?: Record<string, { v?: number }>;
    city?: { name?: string };
  };
}

const uvLevel = (val: number): { label: string; color: string; textColor: string; advice: string } => {
  if (val <= 2) return { label: 'Low', color: '#4ade80', textColor: '#052e16', advice: 'No protection needed' };
  if (val <= 5) return { label: 'Moderate', color: '#facc15', textColor: '#422006', advice: 'Wear sunscreen' };
  if (val <= 7) return { label: 'High', color: '#fb923c', textColor: '#431407', advice: 'Seek shade midday' };
  if (val <= 10) return { label: 'Very High', color: '#ef4444', textColor: '#fff', advice: 'Avoid sun exposure' };
  return { label: 'Extreme', color: '#a855f7', textColor: '#fff', advice: 'Stay indoors' };
};

const MOCK_DATA: UvData = {
  value: 3,
  label: 'Moderate',
  color: '#facc15',
  textColor: '#422006',
  advice: 'Wear sunscreen',
  maxUv: 6,
  maxUvTime: '12:30 PM',
};

const UV_SCALE_STOPS = [
  { color: '#4ade80', from: 0 },
  { color: '#facc15', from: 3 },
  { color: '#fb923c', from: 6 },
  { color: '#ef4444', from: 8 },
  { color: '#a855f7', from: 11 },
];

export default function UvIndex({ config, theme }: WidgetComponentProps) {
  const cfg = config as UvIndexConfig | undefined;
  const dataSource = cfg?.dataSource ?? 'openuv';
  const openUvApiKey = cfg?.openUvApiKey?.trim();
  const latitude = cfg?.latitude ?? 53.9171;
  const longitude = cfg?.longitude ?? -122.7497;
  const waqiToken = cfg?.waqiToken?.trim();
  const waqiCity = cfg?.waqiCity?.trim() || 'prince-george';
  const refreshInterval = cfg?.refreshInterval ?? 30;

  const [data, setData] = useState<UvData>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchOpenUv = useCallback(async () => {
    if (!openUvApiKey) {
      setData(MOCK_DATA);
      return;
    }
    try {
      setError(null);
      const url = `https://api.openuv.io/api/v1/uv?lat=${latitude}&lng=${longitude}`;
      const { data: resp } = await fetchJsonWithCache<OpenUvResponse>(url, {
        cacheKey: buildCacheKey('uv-openuv', `${latitude},${longitude}`),
        ttlMs: refreshMs,
        fetchInit: {
          headers: { 'x-access-token': openUvApiKey },
        },
      });

      if (!resp?.result) {
        setError('Invalid API response');
        return;
      }

      const uv = Math.round((resp.result.uv ?? 0) * 10) / 10;
      const level = uvLevel(uv);
      const maxUv = resp.result.uv_max != null ? Math.round(resp.result.uv_max * 10) / 10 : undefined;
      const maxUvTime = resp.result.uv_max_time
        ? new Date(resp.result.uv_max_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined;

      setData({ value: uv, ...level, maxUv, maxUvTime });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [openUvApiKey, latitude, longitude, refreshMs]);

  const fetchWaqiUv = useCallback(async () => {
    if (!waqiToken) {
      setData(MOCK_DATA);
      return;
    }
    try {
      setError(null);
      const url = `https://api.waqi.info/feed/${encodeURIComponent(waqiCity)}/?token=${encodeURIComponent(waqiToken)}`;
      const { data: resp } = await fetchJsonWithCache<WaqiUvResponse>(url, {
        cacheKey: buildCacheKey('uv-waqi', waqiCity),
        ttlMs: refreshMs,
      });

      if (resp?.status !== 'ok' || !resp.data?.iaqi) {
        setError('No UV data available from this station');
        return;
      }

      // WAQI sometimes reports UV under various keys
      const uvVal = resp.data.iaqi.uvi?.v ?? resp.data.iaqi.uv?.v;
      if (uvVal == null) {
        setError('No UV data available from this station');
        return;
      }

      const uv = Math.round(uvVal * 10) / 10;
      const level = uvLevel(uv);
      setData({ value: uv, ...level });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [waqiToken, waqiCity, refreshMs]);

  useEffect(() => {
    let isMounted = true;
    const doFetch = async () => {
      if (!isMounted) return;
      if (dataSource === 'waqi') {
        await fetchWaqiUv();
      } else {
        await fetchOpenUv();
      }
    };
    doFetch();
    const interval = setInterval(doFetch, refreshMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dataSource, fetchOpenUv, fetchWaqiUv, refreshMs]);

  const { containerRef, scale, designWidth: DESIGN_W, designHeight: DESIGN_H, isLandscape } = useAdaptiveFitScale({
    landscape: { w: 340, h: 260 },
    portrait: { w: 240, h: 360 },
  });

  // Position marker on UV scale (0-14 range)
  const markerPercent = Math.min(100, (data.value / 14) * 100);

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
        <div className={`text-sm font-medium opacity-70 mb-1 ${!isLandscape ? 'text-center' : ''}`} style={{ color: theme.accent }}>
          UV Index
        </div>

        {/* Main UV display */}
        <div className={`flex ${isLandscape ? 'items-center gap-5' : 'flex-col items-center gap-3'} mb-4`}>
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: data.color }}
          >
            <span className="text-3xl font-bold" style={{ color: data.textColor }}>
              {data.value}
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-white leading-tight">{data.label}</div>
            <div className="text-sm text-white/50 mt-0.5">
              {data.advice}
            </div>
          </div>
        </div>

        {/* UV scale bar */}
        <div className="mb-4">
          <div className="h-2 rounded-full overflow-hidden flex">
            {UV_SCALE_STOPS.map((stop, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: stop.color }} />
            ))}
          </div>
          <div
            className="relative -mt-1"
            style={{
              left: `${markerPercent}%`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-800 mx-auto" />
          </div>
        </div>

        {/* Max UV info */}
        {data.maxUv != null && (
          <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
            <div className="flex items-center gap-1">
              <span className="font-medium text-white/40">Peak UV</span>
              <span>{data.maxUv}</span>
            </div>
            {data.maxUvTime && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-white/40">at</span>
                <span>{data.maxUvTime}</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 text-sm text-red-400 truncate">{error}</div>
        )}

        {/* Last updated */}
        {lastUpdated && !error && (
          <div className="mt-auto text-sm text-white/40">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'uv-index',
  name: 'UV Index',
  description: 'Display current UV index with sun protection advice',
  icon: 'sun',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: UvIndex,
  OptionsComponent: UvIndexOptions,
  defaultProps: {
    dataSource: 'openuv',
    openUvApiKey: '',
    latitude: 53.9171,
    longitude: -122.7497,
    waqiToken: '',
    waqiCity: 'prince-george',
    refreshInterval: 30,
  },
});
