import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, Circle, Line, G } from 'react-native-svg';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface UvIndexConfig {
  latitude?: number;
  longitude?: number;
  refreshInterval?: number;
  corsProxy?: string;
}

interface UvResponse {
  current: {
    uv_index: number;
  };
}

function getUVColor(uv: number): string {
  if (uv <= 2) return '#4caf50';   // Green — Low
  if (uv <= 5) return '#ffeb3b';   // Yellow — Moderate
  if (uv <= 7) return '#ff9800';   // Orange — High
  if (uv <= 10) return '#f44336';  // Red — Very High
  return '#9c27b0';                // Violet — Extreme
}

function getUVLabel(uv: number): string {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

/** Semi-circle gauge rendered with SVG */
function UVGauge({ uv, size, accentColor }: { uv: number; size: number; accentColor: string }) {
  const cx = size / 2;
  const cy = size * 0.75;
  const r = size * 0.4;
  const strokeW = size * 0.08;

  // Arc from 180° to 0° (left to right, semi-circle)
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = Math.PI;

  // Clamp UV to 0-14 range for gauge
  const clamped = Math.min(Math.max(uv, 0), 14);
  const fraction = clamped / 14;
  const needleAngle = startAngle - fraction * totalAngle;

  // Background arc path
  const arcX1 = cx + r * Math.cos(startAngle);
  const arcY1 = cy + r * Math.sin(startAngle);
  const arcX2 = cx + r * Math.cos(endAngle);
  const arcY2 = cy + r * Math.sin(endAngle);
  const bgArc = `M ${arcX1} ${arcY1} A ${r} ${r} 0 0 1 ${arcX2} ${arcY2}`;

  // Colored arc (progress)
  const progressAngle = startAngle - fraction * totalAngle;
  const progX = cx + r * Math.cos(progressAngle);
  const progY = cy + r * Math.sin(progressAngle);
  const largeArcFlag = fraction > 0.5 ? 1 : 0;
  const colorArc = `M ${arcX1} ${arcY1} A ${r} ${r} 0 ${largeArcFlag} 1 ${progX} ${progY}`;

  // Needle
  const needleLen = r * 0.85;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  const uvColor = getUVColor(uv);

  return (
    <Svg width={size} height={size * 0.8} viewBox={`0 0 ${size} ${size * 0.85}`}>
      {/* Background arc */}
      <Path d={bgArc} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeW} strokeLinecap="round" />
      {/* Colored progress arc */}
      {fraction > 0 && (
        <Path d={colorArc} fill="none" stroke={uvColor} strokeWidth={strokeW} strokeLinecap="round" />
      )}
      {/* Needle */}
      <G>
        <Line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
        <Circle cx={cx} cy={cy} r={4} fill={accentColor} />
      </G>
    </Svg>
  );
}

export default function UvIndex({
  config,
  theme,
  corsProxy: globalCorsProxy,
  width,
  height,
}: WidgetComponentProps) {
  const uc = config as UvIndexConfig | undefined;
  const lat = uc?.latitude ?? 40.7128;
  const lng = uc?.longitude ?? -74.006;
  const refreshInterval = uc?.refreshInterval ?? 15;
  const corsProxy = uc?.corsProxy?.trim() || globalCorsProxy;
  const refreshMs = refreshInterval * 60 * 1000;

  const [uv, setUv] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const targetUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=uv_index`;
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { data } = await fetchJsonWithCache<UvResponse>(fetchUrl, {
        cacheKey: buildCacheKey('uv-index', `${lat}:${lng}`),
        ttlMs: refreshMs,
      });
      setUv(Math.round(data.current.uv_index * 10) / 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [lat, lng, corsProxy, refreshMs]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(width, height, {
    landscape: { w: 240, h: 220 },
    portrait: { w: 200, h: 260 },
  });

  const uvColor = uv != null ? getUVColor(uv) : 'rgba(255,255,255,0.3)';

  return (
    <View style={[st.container, { backgroundColor: `${theme.primary}20` }]}>
      <View
        style={{
          width: designWidth,
          height: designHeight,
          transform: [{ scale }],
          transformOrigin: 'top left',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <View style={st.header}>
          <AppIcon name="sun" size={18} color={theme.accent} />
          <Text style={[st.title, { color: theme.accent }]}>UV Index</Text>
        </View>

        {error ? (
          <Text style={st.error}>{error}</Text>
        ) : uv != null ? (
          <>
            <UVGauge uv={uv} size={160} accentColor={theme.accent} />
            <Text style={[st.uvValue, { color: uvColor }]}>{uv}</Text>
            <Text style={[st.uvLabel, { color: uvColor }]}>{getUVLabel(uv)}</Text>
          </>
        ) : (
          <Text style={st.loading}>Loading...</Text>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '600' },
  uvValue: { fontSize: 36, fontWeight: '800', marginTop: -8 },
  uvLabel: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  loading: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
});

registerWidget({
  type: 'uv-index',
  name: 'UV Index',
  description: 'Display current UV index with a gauge visualization',
  icon: 'sun',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: UvIndex,
  defaultProps: {
    latitude: 40.7128,
    longitude: -74.006,
    refreshInterval: 15,
    corsProxy: '',
  },
});
