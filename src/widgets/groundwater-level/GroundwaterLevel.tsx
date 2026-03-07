'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import GroundwaterLevelOptions from './GroundwaterLevelOptions';

interface GroundwaterConfig {
  locationId?: string;
  dataSet?: string;
  displayMode?: 'current' | 'history';
  refreshInterval?: number;
  corsProxy?: string;
}

interface TimeSeriesPoint {
  Timestamp: string;
  Value: { Numeric?: number; Display?: string };
}

interface TimeSeriesDescription {
  UniqueId: string;
  Identifier: string;
  Parameter: string;
  Label: string;
  Unit: string;
  LastModified?: string;
}

interface TimeSeriesDescriptionListResponse {
  TimeSeriesDescriptions?: TimeSeriesDescription[];
}

interface TimeSeriesCorrectedDataResponse {
  Points?: TimeSeriesPoint[];
  Unit?: string;
  Parameter?: string;
  LocationIdentifier?: string;
  NumPoints?: number;
}

interface GwData {
  locationId: string;
  dataSetLabel: string;
  currentLevel: number | null;
  unit: string;
  timestamp: string | null;
  history: { time: string; value: number }[];
  availableDataSets: { id: string; label: string; parameter: string; unit: string }[];
}

const AQUARIUS_BASE =
  'https://bcmoe-prod.aquaticinformatics.net/AQUARIUS/Publish/v2';

const MOCK_DATA: GwData = {
  locationId: 'OW378',
  dataSetLabel: 'Groundwater Level (SGWL)',
  currentLevel: 5.234,
  unit: 'm',
  timestamp: new Date().toISOString(),
  history: Array.from({ length: 24 }, (_, i) => ({
    time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: 5.0 + Math.sin(i / 4) * 0.5 + Math.random() * 0.1,
  })),
  availableDataSets: [
    { id: 'mock-sgwl', label: 'SGWL.Working', parameter: 'SGWL', unit: 'm' },
  ],
};

/**
 * Parse the WebPortal HTML page for the latest groundwater reading.
 * This is a fallback when the Publish API is not accessible.
 */
const parseWebPortalHtml = (html: string, locationId: string): Partial<GwData> | null => {
  // Look for data values in the HTML — the Summary page shows the latest reading
  // in a table or data element.
  const valueMatch =
    html.match(/(?:Latest|Value|Level)[^<]*?(-?\d+\.?\d*)\s*(m\b|metres?|masl)?/i) ||
    html.match(/<td[^>]*>\s*(-?\d+\.\d{1,4})\s*<\/td>/i);

  if (!valueMatch) return null;

  const val = parseFloat(valueMatch[1]);
  if (isNaN(val)) return null;

  const unit = valueMatch[2] ? 'm' : 'm';

  // Try to extract timestamp
  const timeMatch = html.match(
    /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?)/
  );

  return {
    locationId,
    currentLevel: val,
    unit,
    timestamp: timeMatch ? timeMatch[1] : null,
    dataSetLabel: 'Groundwater Level',
  };
};

/** Build a simple SVG sparkline from data points. */
function Sparkline({
  data,
  width,
  height,
  color,
}: {
  data: number[];
  width: number;
  height: number;
  color: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const usableH = height - padding * 2;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = padding + usableH - ((v - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Area fill
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block"
    >
      <polygon points={areaPoints} fill={`${color}20`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Latest point dot */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * stepX}
          cy={
            padding +
            usableH -
            ((data[data.length - 1] - min) / range) * usableH
          }
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  );
}

export default function GroundwaterLevel({
  config,
  theme,
  corsProxy: globalCorsProxy,
}: WidgetComponentProps) {
  const cfg = config as GroundwaterConfig | undefined;
  const locationId = cfg?.locationId?.trim() || 'OW378';
  const selectedDataSet = cfg?.dataSet?.trim() || '';
  const displayMode = cfg?.displayMode ?? 'current';
  const refreshInterval = cfg?.refreshInterval ?? 30;
  const corsProxy = cfg?.corsProxy?.trim() || globalCorsProxy;

  const [data, setData] = useState<GwData>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  const fetchViaPublishApi = useCallback(async (): Promise<GwData | null> => {
    if (!corsProxy) return null;

    // Step 1: Get available time series for this location
    const descUrl = `${AQUARIUS_BASE}/GetTimeSeriesDescriptionList?LocationIdentifier=${encodeURIComponent(locationId)}`;
    const descFetchUrl = buildProxyUrl(corsProxy, descUrl);

    const { data: descResp } = await fetchJsonWithCache<TimeSeriesDescriptionListResponse>(
      descFetchUrl,
      {
        cacheKey: buildCacheKey('gw-desc', locationId),
        ttlMs: 60 * 60 * 1000, // 1 hour for metadata
      }
    );

    const descriptions = descResp?.TimeSeriesDescriptions ?? [];
    if (descriptions.length === 0) return null;

    const availableDataSets = descriptions.map((d) => ({
      id: d.UniqueId,
      label: d.Identifier,
      parameter: d.Parameter,
      unit: d.Unit,
    }));

    // Step 2: Pick the dataset — prefer user selection, then SGWL, then first
    let chosen = descriptions[0];
    if (selectedDataSet) {
      const match = descriptions.find(
        (d) =>
          d.UniqueId === selectedDataSet ||
          d.Identifier.toLowerCase().includes(selectedDataSet.toLowerCase())
      );
      if (match) chosen = match;
    } else {
      const sgwl = descriptions.find(
        (d) =>
          d.Parameter?.toLowerCase().includes('gwl') ||
          d.Identifier?.toLowerCase().includes('sgwl') ||
          d.Identifier?.toLowerCase().includes('groundwater')
      );
      if (sgwl) chosen = sgwl;
    }

    // Step 3: Fetch corrected data for the chosen time series
    const now = new Date();
    const queryFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days
    const dataUrl =
      `${AQUARIUS_BASE}/GetTimeSeriesCorrectedData` +
      `?TimeSeriesUniqueId=${encodeURIComponent(chosen.UniqueId)}` +
      `&QueryFrom=${queryFrom.toISOString()}` +
      `&QueryTo=${now.toISOString()}`;
    const dataFetchUrl = buildProxyUrl(corsProxy, dataUrl);

    const { data: tsResp } = await fetchJsonWithCache<TimeSeriesCorrectedDataResponse>(
      dataFetchUrl,
      {
        cacheKey: buildCacheKey('gw-data', `${locationId}-${chosen.UniqueId}`),
        ttlMs: refreshMs,
      }
    );

    const points = tsResp?.Points ?? [];
    const history = points
      .filter((p) => p.Value?.Numeric != null)
      .map((p) => ({
        time: p.Timestamp,
        value: p.Value.Numeric!,
      }));

    const latest = history.length > 0 ? history[history.length - 1] : null;

    return {
      locationId,
      dataSetLabel: chosen.Label || chosen.Identifier || chosen.Parameter,
      currentLevel: latest?.value ?? null,
      unit: chosen.Unit || tsResp?.Unit || 'm',
      timestamp: latest?.time ?? null,
      history,
      availableDataSets,
    };
  }, [corsProxy, locationId, selectedDataSet, refreshMs]);

  const fetchViaWebPortal = useCallback(async (): Promise<Partial<GwData> | null> => {
    if (!corsProxy) return null;

    const portalUrl =
      `https://bcmoe-prod.aquaticinformatics.net/Data/DataSet/Summary` +
      `/Location/${encodeURIComponent(locationId)}` +
      `/DataSet/SGWL/Working/Interval/Latest`;
    const fetchUrl = buildProxyUrl(corsProxy, portalUrl);

    const { text } = await fetchTextWithCache(fetchUrl, {
      cacheKey: buildCacheKey('gw-portal', locationId),
      ttlMs: refreshMs,
    });

    return parseWebPortalHtml(text, locationId);
  }, [corsProxy, locationId, refreshMs]);

  const fetchData = useCallback(async () => {
    if (!corsProxy) {
      setData({ ...MOCK_DATA, locationId });
      return;
    }

    try {
      setError(null);

      // Try the Publish API first
      const apiData = await fetchViaPublishApi();
      if (apiData) {
        setData(apiData);
        setLastUpdated(new Date());
        return;
      }

      // Fallback to WebPortal HTML parsing
      const portalData = await fetchViaWebPortal();
      if (portalData && portalData.currentLevel != null) {
        setData((prev) => ({ ...prev, ...portalData, locationId }));
        setLastUpdated(new Date());
        return;
      }

      setError('No data available for this location');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [corsProxy, locationId, fetchViaPublishApi, fetchViaWebPortal]);

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

  const levelDisplay =
    data.currentLevel != null ? data.currentLevel.toFixed(3) : '—';

  const historyValues = data.history.map((h) => h.value);
  const trend =
    historyValues.length >= 2
      ? historyValues[historyValues.length - 1] - historyValues[historyValues.length - 2]
      : 0;
  const trendArrow = trend > 0.001 ? '\u2191' : trend < -0.001 ? '\u2193' : '\u2192';

  const showHistory = displayMode === 'history' && historyValues.length >= 2;

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
          {data.locationId} &mdash; Groundwater
        </div>

        {/* Main level display */}
        <div className="flex items-center gap-5 mb-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${theme.accent}30` }}
          >
            {/* Water drop SVG */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10"
            >
              <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white leading-tight">
                {levelDisplay}
              </span>
              <span className="text-lg text-white/50">{data.unit}</span>
            </div>
            <div className="text-sm text-white/50 mt-0.5">
              {data.dataSetLabel}
              <span className="ml-2 text-white/40">{trendArrow}</span>
            </div>
          </div>
        </div>

        {/* History sparkline or level bar */}
        {showHistory ? (
          <div className="mb-3">
            <Sparkline
              data={historyValues}
              width={292}
              height={60}
              color={theme.accent}
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>7d ago</span>
              <span>Now</span>
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <div className="h-2 rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(5, (data.currentLevel ?? 0) * 10))}%`,
                  backgroundColor: theme.accent,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        {historyValues.length > 0 && (
          <div className="flex gap-4 text-sm text-white/60">
            <div>
              <span className="text-white/40 mr-1">Min</span>
              {Math.min(...historyValues).toFixed(2)}
            </div>
            <div>
              <span className="text-white/40 mr-1">Max</span>
              {Math.max(...historyValues).toFixed(2)}
            </div>
            <div>
              <span className="text-white/40 mr-1">Avg</span>
              {(
                historyValues.reduce((a, b) => a + b, 0) / historyValues.length
              ).toFixed(2)}
            </div>
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

registerWidget({
  type: 'groundwater-level',
  name: 'Groundwater Level',
  description: 'BC observation well groundwater levels',
  icon: 'droplets',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: GroundwaterLevel,
  OptionsComponent: GroundwaterLevelOptions,
  defaultProps: {
    locationId: 'OW378',
    dataSet: '',
    displayMode: 'current',
    refreshInterval: 30,
    corsProxy: '',
  },
});
