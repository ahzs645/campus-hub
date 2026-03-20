import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface AuroraForecastConfig {
  latitude?: number;
  longitude?: number;
  refreshInterval?: number;
  corsProxy?: string;
}

interface KpData {
  kp: number;
  timestamp?: string;
}

const NOAA_KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

function getKpColor(kp: number): string {
  if (kp < 2) return '#22c55e';
  if (kp < 4) return '#84cc16';
  if (kp < 5) return '#eab308';
  if (kp < 7) return '#f97316';
  if (kp < 8) return '#ef4444';
  return '#dc2626';
}

function getKpLabel(kp: number): string {
  if (kp < 2) return 'Quiet';
  if (kp < 4) return 'Unsettled';
  if (kp < 5) return 'Active';
  if (kp < 7) return 'Storm';
  if (kp < 8) return 'Strong Storm';
  return 'Extreme Storm';
}

function getAuroraProbability(kp: number, latitude: number): number {
  const absLat = Math.abs(latitude);
  // Very rough estimation: higher latitudes and higher Kp = better chance
  if (absLat < 30) return Math.min(kp * 2, 10);
  if (absLat < 45) return Math.min(kp * 5, 40);
  if (absLat < 55) return Math.min(kp * 10, 70);
  if (absLat < 65) return Math.min(kp * 12 + 10, 95);
  return Math.min(kp * 10 + 30, 99);
}

export default function AuroraForecast({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as AuroraForecastConfig | undefined;
  const latitude = cc?.latitude ?? 64.0;
  const longitude = cc?.longitude ?? -21.0;
  const refreshInterval = cc?.refreshInterval ?? 30;
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshMs = refreshInterval * 60 * 1000;

  const [kpData, setKpData] = useState<KpData>({ kp: 3 });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchKp = useCallback(async () => {
    try {
      const fetchUrl = buildProxyUrl(corsProxy, NOAA_KP_URL);
      const { data } = await fetchJsonWithCache<string[][]>(fetchUrl, {
        cacheKey: buildCacheKey('aurora-kp', NOAA_KP_URL),
        ttlMs: refreshMs,
      });
      // NOAA returns array of arrays: [["time_tag","Kp","observed/estimated/predicted"], ...]
      // First row is header, find the latest observed or estimated value
      if (Array.isArray(data) && data.length > 1) {
        let latestKp = 3;
        let latestTime = '';
        for (let i = data.length - 1; i >= 1; i--) {
          const row = data[i];
          if (row && row.length >= 2) {
            const kpVal = parseFloat(row[1]);
            if (!isNaN(kpVal)) {
              latestKp = kpVal;
              latestTime = row[0] ?? '';
              break;
            }
          }
        }
        setKpData({ kp: latestKp, timestamp: latestTime });
        setError(null);
        setLastUpdated(new Date());
      }
    } catch {
      setError('Failed to load forecast');
    }
  }, [corsProxy, refreshMs]);

  useEffect(() => {
    fetchKp();
    const interval = setInterval(fetchKp, refreshMs);
    return () => clearInterval(interval);
  }, [fetchKp, refreshMs]);

  const kp = kpData.kp;
  const color = getKpColor(kp);
  const label = getKpLabel(kp);
  const probability = getAuroraProbability(kp, latitude);

  // Kp scale segments (0-9)
  const kpSegments = Array.from({ length: 10 }, (_, i) => i);

  return (
    <View style={[s.container, { width, height, backgroundColor: `${theme.primary}20` }]}>
      <View style={s.inner}>
        {/* Header */}
        <View style={s.header}>
          <AppIcon name="sparkles" size={16} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Aurora Forecast</Text>
        </View>
        {/* Kp value */}
        <View style={s.kpRow}>
          <Text style={[s.kpValue, { color }]}>{kp.toFixed(1)}</Text>
          <View style={s.kpMeta}>
            <Text style={s.kpLabel}>Kp Index</Text>
            <Text style={[s.kpStatus, { color }]}>{label}</Text>
          </View>
        </View>
        {/* Kp bar */}
        <View style={s.kpBar}>
          {kpSegments.map(i => (
            <View
              key={i}
              style={[
                s.kpSegment,
                { backgroundColor: i <= Math.floor(kp) ? getKpColor(i) : 'rgba(255,255,255,0.08)' },
              ]}
            />
          ))}
        </View>
        {/* Probability */}
        <View style={s.probRow}>
          <Text style={s.probLabel}>Visibility at {Math.abs(latitude).toFixed(1)}{'\u00B0'}{latitude >= 0 ? 'N' : 'S'}</Text>
          <Text style={[s.probValue, { color }]}>{probability}%</Text>
        </View>
        {error && <Text style={s.error}>{error}</Text>}
        {lastUpdated && (
          <Text style={s.updated}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12 },
  inner: { flex: 1, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  headerText: { fontSize: 14, fontWeight: '600' },
  kpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  kpValue: { fontSize: 40, fontWeight: '800' },
  kpMeta: { justifyContent: 'center' },
  kpLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  kpStatus: { fontSize: 14, fontWeight: '600' },
  kpBar: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  kpSegment: { flex: 1, height: 6, borderRadius: 3 },
  probRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  probLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  probValue: { fontSize: 18, fontWeight: '700' },
  error: { color: '#ef4444', fontSize: 11, marginTop: 6 },
  updated: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
});

registerWidget({
  type: 'aurora-forecast',
  name: 'Aurora Forecast',
  description: 'Shows aurora/northern lights forecast with Kp index',
  icon: 'sparkles',
  minW: 2, minH: 2, defaultW: 3, defaultH: 2,
  component: AuroraForecast,
  defaultProps: { latitude: 64.0, longitude: -21.0, refreshInterval: 30 },
});
