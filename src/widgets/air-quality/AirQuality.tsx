'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import AirQualityOptions from './AirQualityOptions';

interface AirQualityConfig {
  dataSource?: 'waqi' | 'bc-aqhi';
  waqiToken?: string;
  waqiCity?: string;
  refreshInterval?: number;
  corsProxy?: string;
}

interface AqiData {
  value: number;
  label: string;
  color: string;
  textColor: string;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
  dominantPollutant?: string;
  station?: string;
  lastUpdated?: string;
}

// WAQI response shape
interface WaqiResponse {
  status?: string;
  data?: {
    aqi?: number;
    dominentpol?: string;
    iaqi?: Record<string, { v?: number }>;
    city?: { name?: string };
    time?: { s?: string };
  };
}

// BC AQHI scale: 1-3 Low, 4-6 Moderate, 7-10 High, 10+ Very High
const aqhiLevel = (val: number): { label: string; color: string; textColor: string } => {
  if (val <= 3) return { label: 'Low Risk', color: '#00ccaa', textColor: '#003322' };
  if (val <= 6) return { label: 'Moderate Risk', color: '#ffcc00', textColor: '#332b00' };
  if (val <= 10) return { label: 'High Risk', color: '#ff6600', textColor: '#fff' };
  return { label: 'Very High Risk', color: '#cc0033', textColor: '#fff' };
};

// US EPA AQI scale
const aqiLevel = (val: number): { label: string; color: string; textColor: string } => {
  if (val <= 50) return { label: 'Good', color: '#00e400', textColor: '#003300' };
  if (val <= 100) return { label: 'Moderate', color: '#ffff00', textColor: '#333300' };
  if (val <= 150) return { label: 'Unhealthy (Sensitive)', color: '#ff7e00', textColor: '#fff' };
  if (val <= 200) return { label: 'Unhealthy', color: '#ff0000', textColor: '#fff' };
  if (val <= 300) return { label: 'Very Unhealthy', color: '#8f3f97', textColor: '#fff' };
  return { label: 'Hazardous', color: '#7e0023', textColor: '#fff' };
};

const BC_AQHI_URL = 'https://www.env.gov.bc.ca/epd/bcairquality/data/aqhi.html?id=AQHI-PRINCE_GEORGE';

const parseBcAqhi = (html: string): AqiData | null => {
  // The BC AQHI page shows current reading in a bold/large font.
  // Look for the AQHI value which is typically in the page content.
  const aqhiMatch = html.match(/AQHI[^<]*?(\d+(?:\.\d+)?)/i)
    || html.match(/<td[^>]*>(\d{1,2})<\/td>/i)
    || html.match(/class="[^"]*aqhi[^"]*"[^>]*>(\d+)/i);

  if (!aqhiMatch) return null;
  const val = parseInt(aqhiMatch[1], 10);
  if (isNaN(val)) return null;

  const level = aqhiLevel(val);
  return {
    value: val,
    ...level,
    station: 'Prince George (BC AQHI)',
  };
};

const MOCK_DATA: AqiData = {
  value: 42,
  label: 'Good',
  color: '#00e400',
  textColor: '#003300',
  pm25: 8.5,
  pm10: 15,
  o3: 32,
  station: 'Prince George',
  dominantPollutant: 'pm25',
};

export default function AirQuality({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const aqConfig = config as AirQualityConfig | undefined;
  const dataSource = aqConfig?.dataSource ?? 'waqi';
  const waqiToken = aqConfig?.waqiToken?.trim();
  const waqiCity = aqConfig?.waqiCity?.trim() || 'prince-george';
  const refreshInterval = aqConfig?.refreshInterval ?? 15;
  const corsProxy = aqConfig?.corsProxy?.trim() || globalCorsProxy;

  const [data, setData] = useState<AqiData>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchWaqi = useCallback(async () => {
    if (!waqiToken) {
      setData(MOCK_DATA);
      return;
    }
    try {
      setError(null);
      const url = `https://api.waqi.info/feed/${encodeURIComponent(waqiCity)}/?token=${encodeURIComponent(waqiToken)}`;
      const { data: resp } = await fetchJsonWithCache<WaqiResponse>(url, {
        cacheKey: buildCacheKey('aqi-waqi', waqiCity),
        ttlMs: refreshMs,
      });

      if (resp?.status !== 'ok' || !resp.data) {
        setError('Invalid API response');
        return;
      }

      const aqi = resp.data.aqi ?? 0;
      const level = aqiLevel(aqi);
      const iaqi = resp.data.iaqi ?? {};

      setData({
        value: aqi,
        ...level,
        pm25: iaqi.pm25?.v,
        pm10: iaqi.pm10?.v,
        o3: iaqi.o3?.v,
        no2: iaqi.no2?.v,
        so2: iaqi.so2?.v,
        co: iaqi.co?.v,
        dominantPollutant: resp.data.dominentpol,
        station: resp.data.city?.name ?? waqiCity,
        lastUpdated: resp.data.time?.s,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [waqiToken, waqiCity, refreshMs]);

  const fetchBcAqhi = useCallback(async () => {
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, BC_AQHI_URL);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('aqi-bcaqhi', BC_AQHI_URL),
        ttlMs: refreshMs,
      });
      const parsed = parseBcAqhi(text);
      if (parsed) {
        setData(parsed);
        setLastUpdated(new Date());
      } else {
        setError('Failed to parse BC AQHI data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [corsProxy, refreshMs]);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (!isMounted) return;
      if (dataSource === 'bc-aqhi') {
        await fetchBcAqhi();
      } else {
        await fetchWaqi();
      }
    };
    fetch();
    const interval = setInterval(fetch, refreshMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dataSource, fetchWaqi, fetchBcAqhi, refreshMs]);

  const { containerRef, scale, designWidth: DESIGN_W, designHeight: DESIGN_H, isLandscape } = useAdaptiveFitScale({
    landscape: { w: 340, h: 280 },
    portrait: { w: 240, h: 380 },
  });

  const pollutants = [
    { key: 'pm25', label: 'PM2.5', value: data.pm25 },
    { key: 'pm10', label: 'PM10', value: data.pm10 },
    { key: 'o3', label: 'O\u2083', value: data.o3 },
    { key: 'no2', label: 'NO\u2082', value: data.no2 },
    { key: 'so2', label: 'SO\u2082', value: data.so2 },
    { key: 'co', label: 'CO', value: data.co },
  ].filter((p) => p.value != null);

  const isBcAqhi = dataSource === 'bc-aqhi';
  const scaleLabel = isBcAqhi ? 'AQHI' : 'AQI';

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
          {data.station ?? 'Air Quality'}
        </div>

        {/* Main AQI display */}
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
              {scaleLabel} Scale{data.dominantPollutant ? ` \u2022 ${data.dominantPollutant.toUpperCase()}` : ''}
            </div>
          </div>
        </div>

        {/* AQI bar visualization */}
        <div className="mb-4">
          <div className="h-2 rounded-full overflow-hidden flex">
            <div className="flex-1" style={{ backgroundColor: '#00e400' }} />
            <div className="flex-1" style={{ backgroundColor: '#ffff00' }} />
            <div className="flex-1" style={{ backgroundColor: '#ff7e00' }} />
            <div className="flex-1" style={{ backgroundColor: '#ff0000' }} />
            <div className="flex-1" style={{ backgroundColor: '#8f3f97' }} />
            <div className="flex-1" style={{ backgroundColor: '#7e0023' }} />
          </div>
          <div
            className="relative -mt-1"
            style={{
              left: `${Math.min(100, (data.value / 300) * 100)}%`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-gray-800 mx-auto" />
          </div>
        </div>

        {/* Pollutant breakdown */}
        {pollutants.length > 0 && (
          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60 ${!isLandscape ? 'justify-center' : ''}`}>
            {pollutants.map((p) => (
              <div key={p.key} className="flex items-center gap-1">
                <span className="font-medium text-white/40">{p.label}</span>
                <span>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
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
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'air-quality',
  name: 'Air Quality',
  description: 'Display current air quality index',
  icon: 'wind',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: AirQuality,
  OptionsComponent: AirQualityOptions,
  defaultProps: {
    dataSource: 'waqi',
    waqiToken: '',
    waqiCity: 'prince-george',
    refreshInterval: 15,
    corsProxy: '',
  },
});
