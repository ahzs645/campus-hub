import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface GroupFitnessConfig {
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
  maxItems?: number;
}

interface FitnessClass {
  name: string;
  time: string;
  instructor?: string;
  location?: string;
}

export default function GroupFitness({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const fc = config as GroupFitnessConfig | undefined;
  const apiUrl = fc?.apiUrl?.trim();
  const corsProxy = fc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = fc?.refreshInterval ?? 10;
  const maxItems = fc?.maxItems ?? 8;
  const refreshMs = refreshInterval * 60 * 1000;

  const [classes, setClasses] = useState<FitnessClass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data } = await fetchJsonWithCache<FitnessClass[]>(fetchUrl, {
        cacheKey: buildCacheKey('group-fitness', apiUrl),
        ttlMs: refreshMs,
      });
      setClasses(data.slice(0, maxItems));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [apiUrl, corsProxy, refreshMs, maxItems]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs, apiUrl]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 400, h: 300 }, portrait: { w: 280, h: 400 } },
  );

  if (!apiUrl) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="users" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>No schedule configured</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={s.header}>
          <AppIcon name="users" size={20} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Group Fitness</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {classes.length === 0 && !error && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No classes scheduled</Text>
          </View>
        )}

        {classes.map((cls, index) => (
          <View key={`${cls.name}-${cls.time}-${index}`} style={[s.row, index < classes.length - 1 && s.rowBorder]}>
            <View style={s.timeColumn}>
              <Text style={[s.timeText, { color: theme.accent }]}>{cls.time}</Text>
            </View>
            <View style={s.infoColumn}>
              <Text style={s.className} numberOfLines={1}>{cls.name}</Text>
              <View style={s.metaRow}>
                {cls.instructor && (
                  <Text style={s.metaText} numberOfLines={1}>{cls.instructor}</Text>
                )}
                {cls.location && (
                  <Text style={s.metaText} numberOfLines={1}>{cls.location}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  timeColumn: { width: 56, alignItems: 'flex-end' },
  timeText: { fontSize: 13, fontWeight: '700' },
  infoColumn: { flex: 1 },
  className: { color: 'white', fontSize: 14, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
});

registerWidget({
  type: 'group-fitness',
  name: 'Group Fitness',
  description: 'Display upcoming group fitness classes',
  icon: 'users',
  minW: 3, minH: 2, defaultW: 4, defaultH: 3,
  component: GroupFitness,
  defaultProps: { apiUrl: '', corsProxy: '', refreshInterval: 10, maxItems: 8 },
});
