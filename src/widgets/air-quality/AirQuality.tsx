'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { fetchJsonWithCache, buildCacheKey } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import AppIcon from '@/components/AppIcon';
import AirQualityOptions from './AirQualityOptions';

interface AirQualityConfig {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  refreshInterval?: number; // minutes
  showDetails?: boolean;
}

interface AQIData {
  aqi: number;
  pm25: number;
  pm10: number;
  uv: number;
  ozone: number;
  no2: number;
  so2: number;
}

interface OpenMeteoAQResponse {
  current?: {
    european_aqi?: number;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    uv_index?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
  };
}

// AQI level definitions based on US EPA standard
const AQI_LEVELS = [
  { max: 50, label: 'Good', color: '#22c55e', bg: '#22c55e20' },
  { max: 100, label: 'Moderate', color: '#eab308', bg: '#eab30820' },
  { max: 150, label: 'Unhealthy (Sensitive)', color: '#f97316', bg: '#f9731620' },
  { max: 200, label: 'Unhealthy', color: '#ef4444', bg: '#ef444420' },
  { max: 300, label: 'Very Unhealthy', color: '#a855f7', bg: '#a855f720' },
  { max: 500, label: 'Hazardous', color: '#7f1d1d', bg: '#7f1d1d40' },
];

const getAQILevel = (aqi: number) => {
  return AQI_LEVELS.find((l) => aqi <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];
};

// Demo data
const DEMO_DATA: AQIData = {
  aqi: 42,
  pm25: 8.5,
  pm10: 15.2,
  uv: 3,
  ozone: 68,
  no2: 12,
  so2: 4,
};

export default function AirQuality({ config, theme }: WidgetComponentProps) {
  const aqConfig = config as AirQualityConfig | undefined;
  const lat = aqConfig?.latitude ?? 53.8931;
  const lon = aqConfig?.longitude ?? -122.8142;
  const locationName = aqConfig?.locationName ?? 'UNBC Campus';
  const refreshInterval = aqConfig?.refreshInterval ?? 15;
  const showDetails = aqConfig?.showDetails ?? true;

  const [data, setData] = useState<AQIData>(DEMO_DATA);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(true);

  const DESIGN_W = 340;
  const DESIGN_H = 280;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  const fetchAQI = useCallback(async () => {
    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm2_5,pm10,uv_index,ozone,nitrogen_dioxide,sulphur_dioxide`;
      const { data: response } = await fetchJsonWithCache<OpenMeteoAQResponse>(url, {
        cacheKey: buildCacheKey('air-quality', `${lat}:${lon}`),
        ttlMs: refreshInterval * 60 * 1000,
        allowStale: true,
      });

      const current = response?.current;
      if (current) {
        setData({
          aqi: current.us_aqi ?? current.european_aqi ?? 0,
          pm25: current.pm2_5 ?? 0,
          pm10: current.pm10 ?? 0,
          uv: current.uv_index ?? 0,
          ozone: current.ozone ?? 0,
          no2: current.nitrogen_dioxide ?? 0,
          so2: current.sulphur_dioxide ?? 0,
        });
        setLastUpdated(new Date());
        setIsDemo(false);
        setError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('AirQuality fetch error:', err);
    }
  }, [lat, lon, refreshInterval]);

  useEffect(() => {
    fetchAQI();
    const interval = setInterval(fetchAQI, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAQI, refreshInterval]);

  const level = getAQILevel(data.aqi);

  // UV Index label
  const uvLabel = data.uv <= 2 ? 'Low' : data.uv <= 5 ? 'Moderate' : data.uv <= 7 ? 'High' : data.uv <= 10 ? 'Very High' : 'Extreme';

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden rounded-2xl"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <AppIcon name="leaf" className="w-6 h-6" style={{ color: theme.accent }} />
          <div className="flex-1">
            <div className="text-base font-bold text-white">{locationName}</div>
            <div className="text-xs text-white/50">
              Air Quality
              {isDemo && ' (demo)'}
            </div>
          </div>
        </div>

        {/* Main AQI display */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-20 h-20 rounded-2xl flex flex-col items-center justify-center"
            style={{ backgroundColor: level.bg, border: `2px solid ${level.color}` }}
          >
            <div className="text-3xl font-bold" style={{ color: level.color }}>
              {data.aqi}
            </div>
            <div className="text-[10px] font-medium text-white/60">AQI</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold" style={{ color: level.color }}>
              {level.label}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-white/60 mt-1">
              <AppIcon name="sun" className="w-3.5 h-3.5" />
              <span>UV: {data.uv} ({uvLabel})</span>
            </div>
          </div>
        </div>

        {/* Details grid */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="flex items-center justify-between text-white/60">
              <span>PM2.5</span>
              <span className="text-white/80">{data.pm25} μg/m³</span>
            </div>
            <div className="flex items-center justify-between text-white/60">
              <span>PM10</span>
              <span className="text-white/80">{data.pm10} μg/m³</span>
            </div>
            <div className="flex items-center justify-between text-white/60">
              <span>O₃</span>
              <span className="text-white/80">{data.ozone} μg/m³</span>
            </div>
            <div className="flex items-center justify-between text-white/60">
              <span>NO₂</span>
              <span className="text-white/80">{data.no2} μg/m³</span>
            </div>
          </div>
        )}

        {/* AQI scale bar */}
        <div className="mt-auto pt-3">
          <div className="flex h-2 rounded-full overflow-hidden">
            {AQI_LEVELS.map((l, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: l.color }} />
            ))}
          </div>
          <div
            className="relative -mt-1"
            style={{ left: `${Math.min((data.aqi / 500) * 100, 100)}%` }}
          >
            <div className="w-2 h-2 rounded-full bg-white border border-black/30 -ml-1" />
          </div>
        </div>

        {/* Error / Last Updated */}
        {error && (
          <div className="text-xs text-red-400 mt-1 truncate">{error}</div>
        )}
        {lastUpdated && !error && (
          <div className="text-xs text-white/30 mt-1">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'air-quality',
  name: 'Air Quality',
  description: 'Air quality index, UV, and pollutant levels with map coordinate picker',
  icon: 'leaf',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: AirQuality,
  OptionsComponent: AirQualityOptions,
  defaultProps: {
    latitude: 53.8931,
    longitude: -122.8142,
    locationName: 'UNBC Campus',
    refreshInterval: 15,
    showDetails: true,
  },
});
