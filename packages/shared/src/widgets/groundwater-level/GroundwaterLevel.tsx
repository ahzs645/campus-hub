import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';
import Svg, { Polyline, Line, Rect } from 'react-native-svg';

interface GroundwaterReading {
  date: string;
  value: number;
}

interface GroundwaterLevelConfig {
  stationId?: string;
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
}

function Sparkline({ data, width: w, height: h, color }: { data: number[]; width: number; height: number; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const chartW = w - padding * 2;
  const chartH = h - padding * 2;

  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * chartW;
      const y = padding + chartH - ((val - min) / range) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Svg width={w} height={h}>
      <Rect x={0} y={0} width={w} height={h} fill="rgba(255,255,255,0.05)" rx={4} />
      {/* Grid lines */}
      <Line x1={padding} y1={padding} x2={padding} y2={h - padding} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      <Line x1={padding} y1={h - padding} x2={w - padding} y2={h - padding} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

const MOCK_READINGS: number[] = [12.3, 12.1, 11.8, 11.5, 11.9, 12.2, 12.0, 11.7, 11.4, 11.6, 11.3, 11.5];

export default function GroundwaterLevel({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as GroundwaterLevelConfig | undefined;
  const stationId = cc?.stationId?.trim();
  const apiUrl = cc?.apiUrl?.trim();
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = cc?.refreshInterval ?? 60;
  const refreshMs = refreshInterval * 60 * 1000;

  const [readings, setReadings] = useState<number[]>(MOCK_READINGS);
  const [currentValue, setCurrentValue] = useState<number>(MOCK_READINGS[MOCK_READINGS.length - 1]);
  const [unit, setUnit] = useState('m');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiUrl || !stationId) return;
    try {
      const targetUrl = apiUrl.replace('{stationId}', encodeURIComponent(stationId));
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { data } = await fetchJsonWithCache<{ readings: GroundwaterReading[]; unit?: string }>(fetchUrl, {
        cacheKey: buildCacheKey('groundwater', `${apiUrl}:${stationId}`),
        ttlMs: refreshMs,
      });
      if (data?.readings && Array.isArray(data.readings) && data.readings.length > 0) {
        const values = data.readings.map(r => r.value);
        setReadings(values);
        setCurrentValue(values[values.length - 1]);
        if (data.unit) setUnit(data.unit);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch {
      setError('Failed to load data');
    }
  }, [apiUrl, stationId, corsProxy, refreshMs]);

  useEffect(() => {
    if (!apiUrl || !stationId) return;
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs, apiUrl, stationId]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 300, h: 180 }, portrait: { w: 200, h: 240 } },
  );

  const trend = readings.length >= 2
    ? readings[readings.length - 1] - readings[readings.length - 2]
    : 0;
  const trendLabel = trend > 0.1 ? 'Rising' : trend < -0.1 ? 'Falling' : 'Stable';
  const trendColor = trend > 0.1 ? '#22c55e' : trend < -0.1 ? '#ef4444' : '#eab308';

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', padding: 14 }}>
        <View style={s.header}>
          <AppIcon name="droplets" size={16} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Groundwater</Text>
        </View>
        <View style={s.valueRow}>
          <Text style={s.value}>{currentValue.toFixed(1)}</Text>
          <Text style={s.unit}>{unit}</Text>
          <View style={[s.trendBadge, { backgroundColor: `${trendColor}20` }]}>
            <Text style={[s.trendText, { color: trendColor }]}>{trendLabel}</Text>
          </View>
        </View>
        <View style={s.chartContainer}>
          <Sparkline
            data={readings}
            width={designWidth - 28}
            height={Math.max(60, designHeight - 110)}
            color={theme.accent}
          />
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        {lastUpdated && (
          <Text style={s.updated}>
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  headerText: { fontSize: 14, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  value: { color: 'white', fontSize: 28, fontWeight: '700' },
  unit: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  trendBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  trendText: { fontSize: 12, fontWeight: '600' },
  chartContainer: { flex: 1 },
  error: { color: '#ef4444', fontSize: 11, marginTop: 4 },
  updated: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
});

registerWidget({
  type: 'groundwater-level',
  name: 'Groundwater Level',
  description: 'Shows groundwater measurement data with sparkline chart',
  icon: 'droplets',
  minW: 2, minH: 2, defaultW: 3, defaultH: 2,
  component: GroundwaterLevel,
  defaultProps: { refreshInterval: 60 },
});
