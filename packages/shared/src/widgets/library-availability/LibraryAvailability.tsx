import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface LibraryAvailabilityConfig {
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
  title?: string;
}

interface ZoneData {
  name: string;
  current: number;
  total: number;
}

const getOccupancyColor = (ratio: number): string => {
  if (ratio < 0.4) return '#22c55e';
  if (ratio < 0.7) return '#eab308';
  return '#ef4444';
};

export default function LibraryAvailability({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const lc = config as LibraryAvailabilityConfig | undefined;
  const apiUrl = lc?.apiUrl?.trim();
  const corsProxy = lc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = lc?.refreshInterval ?? 5;
  const title = lc?.title || 'Library Availability';
  const refreshMs = refreshInterval * 60 * 1000;

  const [zones, setZones] = useState<ZoneData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data } = await fetchJsonWithCache<ZoneData[]>(fetchUrl, {
        cacheKey: buildCacheKey('library', apiUrl),
        ttlMs: refreshMs,
      });
      setZones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [apiUrl, corsProxy, refreshMs]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs, apiUrl]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 400, h: 360 }, portrait: { w: 300, h: 480 } },
  );

  if (!apiUrl) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="school" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>No API configured</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={s.header}>
          <AppIcon name="school" size={20} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>{title}</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {zones.length === 0 && !error && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No data available</Text>
          </View>
        )}

        {zones.map((zone, index) => {
          const ratio = zone.total > 0 ? zone.current / zone.total : 0;
          const pct = Math.min(Math.round(ratio * 100), 100);
          const barColor = getOccupancyColor(ratio);
          return (
            <View key={zone.name} style={[s.zoneRow, index < zones.length - 1 && s.zoneRowBorder]}>
              <View style={s.zoneHeader}>
                <Text style={s.zoneName} numberOfLines={1}>{zone.name}</Text>
                <Text style={[s.zoneCount, { color: barColor }]}>{zone.current}/{zone.total}</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  zoneRow: { paddingHorizontal: 16, paddingVertical: 10 },
  zoneRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  zoneName: { color: 'white', fontSize: 14, fontWeight: '500', flex: 1 },
  zoneCount: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
});

registerWidget({
  type: 'library-availability',
  name: 'Library Availability',
  description: 'Display library zone occupancy',
  icon: 'school',
  minW: 3, minH: 3, defaultW: 4, defaultH: 4,
  component: LibraryAvailability,
  defaultProps: { apiUrl: '', corsProxy: '', refreshInterval: 5, title: 'Library Availability' },
});
