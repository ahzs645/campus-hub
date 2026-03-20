import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface BusConnectionConfig {
  stopId?: string;
  apiUrl?: string;
  routeFilter?: string[];
  refreshInterval?: number;
  corsProxy?: string;
  maxDepartures?: number;
}

interface Departure {
  route: string;
  destination: string;
  time: string;
  delay?: number;
}

export default function BusConnection({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const bc = config as BusConnectionConfig | undefined;
  const stopId = bc?.stopId?.trim();
  const apiUrl = bc?.apiUrl?.trim();
  const routeFilter = bc?.routeFilter;
  const refreshInterval = bc?.refreshInterval ?? 1;
  const corsProxy = bc?.corsProxy?.trim() || globalCorsProxy;
  const maxDepartures = bc?.maxDepartures ?? 6;
  const refreshMs = refreshInterval * 60 * 1000;

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDepartures = useCallback(async () => {
    if (!apiUrl || !stopId) return;
    try {
      setError(null);
      const targetUrl = apiUrl.replace('{stopId}', encodeURIComponent(stopId));
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { data } = await fetchJsonWithCache<Departure[]>(fetchUrl, {
        cacheKey: buildCacheKey('bus', `${apiUrl}:${stopId}`),
        ttlMs: refreshMs,
      });
      let filtered = data;
      if (routeFilter && routeFilter.length > 0) {
        filtered = data.filter((d) => routeFilter.includes(d.route));
      }
      setDepartures(filtered.slice(0, maxDepartures));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [apiUrl, stopId, corsProxy, refreshMs, routeFilter, maxDepartures]);

  useEffect(() => {
    if (!apiUrl || !stopId) return;
    fetchDepartures();
    const interval = setInterval(fetchDepartures, refreshMs);
    return () => clearInterval(interval);
  }, [fetchDepartures, refreshMs, apiUrl, stopId]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 400, h: 300 }, portrait: { w: 280, h: 400 } },
  );

  if (!stopId) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="bus" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>No stop configured</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={s.header}>
          <AppIcon name="bus" size={20} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Bus Departures</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {departures.length === 0 && !error && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No departures found</Text>
          </View>
        )}

        {departures.map((dep, index) => (
          <View key={`${dep.route}-${dep.time}-${index}`} style={[s.row, index < departures.length - 1 && s.rowBorder]}>
            <View style={[s.routeBadge, { backgroundColor: theme.accent }]}>
              <Text style={s.routeText}>{dep.route}</Text>
            </View>
            <Text style={s.destination} numberOfLines={1}>{dep.destination}</Text>
            <Text style={s.time}>{dep.time}</Text>
          </View>
        ))}

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
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  routeBadge: { minWidth: 36, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  routeText: { color: 'white', fontSize: 14, fontWeight: '700' },
  destination: { flex: 1, color: 'white', fontSize: 14 },
  time: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
  updated: { paddingHorizontal: 16, paddingTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
});

registerWidget({
  type: 'bus-connection',
  name: 'Bus Connection',
  description: 'Display bus departures from a stop',
  icon: 'bus',
  minW: 3, minH: 2, defaultW: 4, defaultH: 3,
  component: BusConnection,
  defaultProps: { stopId: '', apiUrl: '', routeFilter: [], refreshInterval: 1, corsProxy: '', maxDepartures: 6 },
});
