import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface AirQualityConfig {
  latitude?: number;
  longitude?: number;
  refreshInterval?: number;
  corsProxy?: string;
}

interface AQIResponse {
  current: {
    us_aqi: number;
    pm10: number;
    pm2_5: number;
  };
}

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#4caf50';   // Green — Good
  if (aqi <= 100) return '#ffeb3b';  // Yellow — Moderate
  if (aqi <= 150) return '#ff9800';  // Orange — Unhealthy for sensitive
  if (aqi <= 200) return '#f44336';  // Red — Unhealthy
  return '#9c27b0';                  // Purple — Very unhealthy / Hazardous
}

function getAQILabel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy (Sensitive)';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export default function AirQuality({
  config,
  theme,
  corsProxy: globalCorsProxy,
  width,
  height,
}: WidgetComponentProps) {
  const ac = config as AirQualityConfig | undefined;
  const lat = ac?.latitude ?? 40.7128;
  const lng = ac?.longitude ?? -74.006;
  const refreshInterval = ac?.refreshInterval ?? 15;
  const corsProxy = ac?.corsProxy?.trim() || globalCorsProxy;
  const refreshMs = refreshInterval * 60 * 1000;

  const [aqi, setAqi] = useState<number | null>(null);
  const [pm25, setPm25] = useState<number | null>(null);
  const [pm10, setPm10] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const targetUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5`;
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { data } = await fetchJsonWithCache<AQIResponse>(fetchUrl, {
        cacheKey: buildCacheKey('air-quality', `${lat}:${lng}`),
        ttlMs: refreshMs,
      });
      setAqi(Math.round(data.current.us_aqi));
      setPm25(Math.round(data.current.pm2_5 * 10) / 10);
      setPm10(Math.round(data.current.pm10 * 10) / 10);
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
    landscape: { w: 320, h: 200 },
    portrait: { w: 220, h: 280 },
  });

  const aqiColor = aqi != null ? getAQIColor(aqi) : 'rgba(255,255,255,0.3)';

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
          padding: 20,
        }}
      >
        <View style={st.header}>
          <AppIcon name="wind" size={20} color={theme.accent} />
          <Text style={[st.title, { color: theme.accent }]}>Air Quality</Text>
        </View>

        {error ? (
          <Text style={st.error}>{error}</Text>
        ) : aqi != null ? (
          <>
            <View style={[st.aqiBadge, { backgroundColor: aqiColor }]}>
              <Text style={st.aqiValue}>{aqi}</Text>
            </View>
            <Text style={[st.aqiLabel, { color: aqiColor }]}>
              {getAQILabel(aqi)}
            </Text>
            <View style={st.details}>
              <View style={st.detailItem}>
                <Text style={st.detailLabel}>PM2.5</Text>
                <Text style={st.detailValue}>{pm25} µg/m³</Text>
              </View>
              <View style={st.detailItem}>
                <Text style={st.detailLabel}>PM10</Text>
                <Text style={st.detailValue}>{pm10} µg/m³</Text>
              </View>
            </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  aqiBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aqiValue: { fontSize: 32, fontWeight: '800', color: '#000' },
  aqiLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  details: { flexDirection: 'row', gap: 24 },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
  detailValue: { fontSize: 14, color: 'white', fontWeight: '600' },
  loading: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
});

registerWidget({
  type: 'air-quality',
  name: 'Air Quality',
  description: 'Display current air quality index and particulate matter levels',
  icon: 'wind',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: AirQuality,
  defaultProps: {
    latitude: 40.7128,
    longitude: -74.006,
    refreshInterval: 15,
    corsProxy: '',
  },
});
