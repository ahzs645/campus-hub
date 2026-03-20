import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';
import Svg, { Path } from 'react-native-svg';

type HazardLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

interface FireHazardConfig {
  region?: string;
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
}

const HAZARD_COLORS: Record<HazardLevel, string> = {
  Low: '#22c55e',
  Moderate: '#eab308',
  High: '#f97316',
  'Very High': '#ef4444',
  Extreme: '#991b1b',
};

const HAZARD_LEVELS: HazardLevel[] = ['Low', 'Moderate', 'High', 'Very High', 'Extreme'];

function FlameIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10zm0 16a2 2 0 0 1-2-2c0-1.2 1-2 2-3 1 1 2 1.8 2 3a2 2 0 0 1-2 2z" />
    </Svg>
  );
}

export default function FireHazard({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as FireHazardConfig | undefined;
  const region = cc?.region ?? 'default';
  const apiUrl = cc?.apiUrl?.trim();
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = cc?.refreshInterval ?? 30;
  const refreshMs = refreshInterval * 60 * 1000;

  const [level, setLevel] = useState<HazardLevel>('Moderate');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHazard = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl.replace('{region}', encodeURIComponent(region)));
      const { data } = await fetchJsonWithCache<{ level: HazardLevel }>(fetchUrl, {
        cacheKey: buildCacheKey('fire-hazard', `${apiUrl}:${region}`),
        ttlMs: refreshMs,
      });
      if (data?.level && HAZARD_LEVELS.includes(data.level)) {
        setLevel(data.level);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch {
      setError('Failed to load data');
    }
  }, [apiUrl, corsProxy, region, refreshMs]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchHazard();
    const interval = setInterval(fetchHazard, refreshMs);
    return () => clearInterval(interval);
  }, [fetchHazard, refreshMs, apiUrl]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 200, h: 200 }, portrait: { w: 180, h: 220 } },
  );

  const color = HAZARD_COLORS[level];
  const levelIndex = HAZARD_LEVELS.indexOf(level);

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={[s.label, { color: theme.accent }]}>Fire Danger</Text>
        <FlameIcon size={56} color={color} />
        <Text style={[s.levelText, { color }]}>{level}</Text>
        {/* Level indicator bar */}
        <View style={s.barContainer}>
          {HAZARD_LEVELS.map((l, idx) => (
            <View
              key={l}
              style={[
                s.barSegment,
                {
                  backgroundColor: idx <= levelIndex ? HAZARD_COLORS[l] : 'rgba(255,255,255,0.1)',
                },
              ]}
            />
          ))}
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  levelText: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  barContainer: { flexDirection: 'row', gap: 3, marginTop: 12, width: '100%' },
  barSegment: { flex: 1, height: 6, borderRadius: 3 },
  error: { color: '#ef4444', fontSize: 11, marginTop: 6 },
  updated: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
});

registerWidget({
  type: 'fire-hazard',
  name: 'Fire Hazard',
  description: 'Shows current fire danger/hazard level',
  icon: 'flame',
  minW: 2, minH: 2, defaultW: 2, defaultH: 2,
  component: FireHazard,
  defaultProps: { region: 'default', refreshInterval: 30 },
});
