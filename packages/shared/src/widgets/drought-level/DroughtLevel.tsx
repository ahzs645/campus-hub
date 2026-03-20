import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

type DroughtSeverity = 'None' | 'Abnormally Dry' | 'Moderate' | 'Severe' | 'Extreme' | 'Exceptional';

interface DroughtLevelConfig {
  region?: string;
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
}

const DROUGHT_LEVELS: DroughtSeverity[] = ['None', 'Abnormally Dry', 'Moderate', 'Severe', 'Extreme', 'Exceptional'];

const DROUGHT_COLORS: Record<DroughtSeverity, string> = {
  None: '#22c55e',
  'Abnormally Dry': '#fde047',
  Moderate: '#f59e0b',
  Severe: '#f97316',
  Extreme: '#ef4444',
  Exceptional: '#991b1b',
};

const DROUGHT_CODES: Record<DroughtSeverity, string> = {
  None: 'D-0',
  'Abnormally Dry': 'D0',
  Moderate: 'D1',
  Severe: 'D2',
  Extreme: 'D3',
  Exceptional: 'D4',
};

export default function DroughtLevel({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as DroughtLevelConfig | undefined;
  const region = cc?.region ?? 'default';
  const apiUrl = cc?.apiUrl?.trim();
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = cc?.refreshInterval ?? 60;
  const refreshMs = refreshInterval * 60 * 1000;

  const [severity, setSeverity] = useState<DroughtSeverity>('None');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDrought = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl.replace('{region}', encodeURIComponent(region)));
      const { data } = await fetchJsonWithCache<{ level: DroughtSeverity }>(fetchUrl, {
        cacheKey: buildCacheKey('drought', `${apiUrl}:${region}`),
        ttlMs: refreshMs,
      });
      if (data?.level && DROUGHT_LEVELS.includes(data.level)) {
        setSeverity(data.level);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch {
      setError('Failed to load data');
    }
  }, [apiUrl, corsProxy, region, refreshMs]);

  useEffect(() => {
    if (!apiUrl) return;
    fetchDrought();
    const interval = setInterval(fetchDrought, refreshMs);
    return () => clearInterval(interval);
  }, [fetchDrought, refreshMs, apiUrl]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 220, h: 200 }, portrait: { w: 180, h: 240 } },
  );

  const color = DROUGHT_COLORS[severity];
  const severityIndex = DROUGHT_LEVELS.indexOf(severity);

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', padding: 16 }}>
        <View style={s.header}>
          <AppIcon name="sun" size={18} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Drought Level</Text>
        </View>
        <View style={s.body}>
          {/* Vertical scale indicator */}
          <View style={s.scaleColumn}>
            {[...DROUGHT_LEVELS].reverse().map((lvl, idx) => {
              const reverseIdx = DROUGHT_LEVELS.length - 1 - idx;
              const isActive = reverseIdx <= severityIndex;
              return (
                <View key={lvl} style={s.scaleRow}>
                  <View
                    style={[
                      s.scaleBar,
                      {
                        backgroundColor: isActive ? DROUGHT_COLORS[lvl] : 'rgba(255,255,255,0.08)',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      s.scaleLabel,
                      {
                        color: isActive ? DROUGHT_COLORS[lvl] : 'rgba(255,255,255,0.25)',
                        fontWeight: lvl === severity ? '700' : '400',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {lvl}
                  </Text>
                </View>
              );
            })}
          </View>
          {/* Current level display */}
          <View style={s.currentDisplay}>
            <Text style={[s.code, { color }]}>{DROUGHT_CODES[severity]}</Text>
            <Text style={[s.severityText, { color }]}>{severity}</Text>
            {error && <Text style={s.error}>{error}</Text>}
            {lastUpdated && (
              <Text style={s.updated}>
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerText: { fontSize: 14, fontWeight: '600' },
  body: { flex: 1, flexDirection: 'row', gap: 12 },
  scaleColumn: { gap: 4, justifyContent: 'center' },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scaleBar: { width: 8, height: 16, borderRadius: 2 },
  scaleLabel: { fontSize: 10 },
  currentDisplay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 32, fontWeight: '800' },
  severityText: { fontSize: 14, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  error: { color: '#ef4444', fontSize: 11, marginTop: 8 },
  updated: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
});

registerWidget({
  type: 'drought-level',
  name: 'Drought Level',
  description: 'Shows current drought severity level',
  icon: 'sun',
  minW: 2, minH: 2, defaultW: 2, defaultH: 2,
  component: DroughtLevel,
  defaultProps: { region: 'default', refreshInterval: 60 },
});
