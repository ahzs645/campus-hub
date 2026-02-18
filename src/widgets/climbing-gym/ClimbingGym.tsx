'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import AppIcon from '@/components/AppIcon';
import ClimbingGymOptions from './ClimbingGymOptions';

interface OccupancyData {
  count: number;
  capacity: number;
  subLabel: string;
  lastUpdate: string;
}

interface ClimbingGymConfig {
  gymName?: string;
  portalUrl?: string;
  refreshInterval?: number; // minutes
  corsProxy?: string;
  showCapacityBar?: boolean;
}

const DEFAULT_PORTAL_URL =
  'https://portal.rockgympro.com/portal/public/e4f8e07377b8d1ba053944154f4c2c50/occupancy?&iframeid=occupancyCounter&fId=';

/** Parse the Rock Gym Pro occupancy HTML page to extract the data object */
const parseOccupancyData = (html: string): OccupancyData | null => {
  // The page embeds a JS object like: var defined_data = { "OEC": { capacity: 30, count: 0, ... } }
  // Try to find JSON-like data in the response
  const dataMatch = html.match(/var\s+defined_data\s*=\s*(\{[\s\S]*?\});/);
  if (!dataMatch?.[1]) return null;

  try {
    const parsed = JSON.parse(dataMatch[1]);
    // Get the first facility key (e.g. "OEC")
    const facilityKey = Object.keys(parsed)[0];
    if (!facilityKey) return null;

    const facility = parsed[facilityKey];
    return {
      count: typeof facility.count === 'number' ? facility.count : parseInt(facility.count, 10) || 0,
      capacity: typeof facility.capacity === 'number' ? facility.capacity : parseInt(facility.capacity, 10) || 0,
      subLabel: facility.subLabel ?? 'Current Climber Count',
      lastUpdate: facility.lastUpdate ?? '',
    };
  } catch {
    return null;
  }
};

/** Build the proxied fetch URL */
const buildProxiedUrl = (corsProxy: string, targetUrl: string): string => {
  if (corsProxy.includes('cors.lol')) {
    return `https://api.cors.lol/?url=${targetUrl.replace('https://', '')}#!`;
  }
  if (corsProxy.includes('corsproxy.io')) {
    return `https://corsproxy.io/?${targetUrl}`;
  }
  if (corsProxy.includes('allorigins.win')) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
  }
  return `${corsProxy}${targetUrl}`;
};

/** Get occupancy level for color-coding */
const getOccupancyLevel = (count: number, capacity: number): 'low' | 'moderate' | 'high' => {
  if (capacity === 0) return 'low';
  const ratio = count / capacity;
  if (ratio < 0.5) return 'low';
  if (ratio < 0.8) return 'moderate';
  return 'high';
};

const LEVEL_COLORS = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#ef4444',
};

export default function ClimbingGym({ config, theme }: WidgetComponentProps) {
  const cfg = config as ClimbingGymConfig | undefined;
  const gymName = cfg?.gymName ?? 'OVERhang';
  const portalUrl = cfg?.portalUrl?.trim() || DEFAULT_PORTAL_URL;
  const refreshInterval = cfg?.refreshInterval ?? 5;
  const corsProxy = cfg?.corsProxy?.trim() || 'https://corsproxy.io/?';
  const showCapacityBar = cfg?.showCapacityBar ?? true;

  const [data, setData] = useState<OccupancyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchOccupancy = useCallback(async () => {
    try {
      setError(null);
      const fetchUrl = buildProxiedUrl(corsProxy, portalUrl);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('climbing-gym', portalUrl),
        ttlMs: refreshMs,
      });
      const parsed = parseOccupancyData(text);
      if (parsed) {
        setData(parsed);
        setLastFetched(new Date());
      } else {
        setError('Could not parse occupancy data');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [corsProxy, portalUrl, refreshMs]);

  useEffect(() => {
    let isMounted = true;
    const doFetch = async () => {
      if (!isMounted) return;
      await fetchOccupancy();
    };
    doFetch();
    const interval = setInterval(doFetch, refreshMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchOccupancy, refreshMs]);

  const count = data?.count ?? 0;
  const capacity = data?.capacity ?? 0;
  const level = getOccupancyLevel(count, capacity);
  const levelColor = LEVEL_COLORS[level];
  const pct = capacity > 0 ? Math.min((count / capacity) * 100, 100) : 0;

  const DESIGN_W = 340;
  const DESIGN_H = 240;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

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
        className="flex flex-col justify-center p-6"
      >
        {/* Gym name */}
        <div className="text-lg font-medium opacity-70 mb-1" style={{ color: theme.accent }}>
          {gymName}
        </div>

        {/* Main count display */}
        <div className="flex items-center gap-4">
          <AppIcon name="mountain" className="w-16 h-16 text-white" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-bold leading-tight" style={{ color: levelColor }}>
                {count}
              </span>
              <span className="text-2xl text-white/50 font-medium">/ {capacity}</span>
            </div>
            <div className="text-base text-white/70">
              {data?.subLabel ?? 'Current Climber Count'}
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        {showCapacityBar && (
          <div className="mt-4">
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{ backgroundColor: `${theme.primary}40` }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: levelColor,
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-white/40">
              <span>{Math.round(pct)}% full</span>
              <span>{level === 'low' ? 'Not busy' : level === 'moderate' ? 'Getting busy' : 'Very busy'}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 text-sm text-red-400 truncate">
            {error}
          </div>
        )}

        {/* Last updated */}
        {data?.lastUpdate && !error && (
          <div className="mt-2 text-sm text-white/40">
            {data.lastUpdate}
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'climbing-gym',
  name: 'Climbing Gym',
  description: 'Live occupancy counter for a climbing gym via Rock Gym Pro',
  icon: 'mountain',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: ClimbingGym,
  OptionsComponent: ClimbingGymOptions,
  defaultProps: {
    gymName: 'OVERhang',
    portalUrl: DEFAULT_PORTAL_URL,
    refreshInterval: 5,
    corsProxy: 'https://corsproxy.io/?',
    showCapacityBar: true,
  },
});
