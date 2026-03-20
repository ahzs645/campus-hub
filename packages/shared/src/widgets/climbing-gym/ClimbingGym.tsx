import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchTextWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface ClimbingGymConfig {
  gymName?: string;
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
}

interface GymData {
  capacity: number;
  gymName: string;
}

const parseCapacity = (html: string): number | null => {
  // Try common patterns: "75%", "75 %", "capacity: 75", percentage in span/div
  const patterns = [
    /(\d{1,3})\s*%/,
    /capacity[:\s]*(\d{1,3})/i,
    /auslastung[:\s]*(\d{1,3})/i,
    /occupancy[:\s]*(\d{1,3})/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const value = parseInt(match[1], 10);
      if (value >= 0 && value <= 100) return value;
    }
  }
  return null;
};

const getCapacityColor = (capacity: number): string => {
  if (capacity < 40) return '#22c55e';
  if (capacity < 70) return '#eab308';
  return '#ef4444';
};

const getCapacityLabel = (capacity: number): string => {
  if (capacity < 40) return 'Low';
  if (capacity < 70) return 'Moderate';
  return 'Busy';
};

export default function ClimbingGym({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const gc = config as ClimbingGymConfig | undefined;
  const gymName = gc?.gymName?.trim() || 'Climbing Gym';
  const apiUrl = gc?.apiUrl?.trim();
  const corsProxy = gc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = gc?.refreshInterval ?? 5;
  const refreshMs = refreshInterval * 60 * 1000;

  const [gymData, setGymData] = useState<GymData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchGymData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('climbing-gym', apiUrl),
        ttlMs: refreshMs,
      });
      const capacity = parseCapacity(text);
      if (capacity !== null) {
        setGymData({ capacity, gymName });
      } else {
        setError('Could not parse capacity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [apiUrl, corsProxy, refreshMs, gymName]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchGymData();
    const interval = setInterval(fetchGymData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchGymData, refreshMs, apiUrl]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 300, h: 200 }, portrait: { w: 220, h: 280 } },
  );

  if (!apiUrl) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="mountain" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>No gym configured</Text>
      </View>
    );
  }

  const capacity = gymData?.capacity ?? 0;
  const capacityColor = getCapacityColor(capacity);
  const capacityLabel = getCapacityLabel(capacity);

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', padding: 16 }}>
        <View style={s.header}>
          <AppIcon name="mountain" size={20} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>{gymName}</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {gymData && (
          <View style={s.content}>
            <Text style={[s.capacityValue, { color: capacityColor }]}>{capacity}%</Text>
            <Text style={[s.capacityLabel, { color: capacityColor }]}>{capacityLabel}</Text>

            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${capacity}%`, backgroundColor: capacityColor }]} />
            </View>

            <Text style={s.hint}>Current occupancy</Text>
          </View>
        )}

        {!gymData && !error && (
          <View style={s.loadingContainer}>
            <Text style={s.emptyText}>Loading...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerText: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  capacityValue: { fontSize: 48, fontWeight: '700' },
  capacityLabel: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  barTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 16, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 4 },
});

registerWidget({
  type: 'climbing-gym',
  name: 'Climbing Gym',
  description: 'Display climbing gym capacity',
  icon: 'mountain',
  minW: 2, minH: 2, defaultW: 3, defaultH: 2,
  component: ClimbingGym,
  defaultProps: { gymName: 'Climbing Gym', apiUrl: '', corsProxy: '', refreshInterval: 5 },
});
