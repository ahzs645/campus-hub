import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface ConfessionsConfig {
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
  maxItems?: number;
  rotationSeconds?: number;
}

interface Confession {
  id: string;
  text: string;
  timestamp?: string;
}

export default function Confessions({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as ConfessionsConfig | undefined;
  const apiUrl = cc?.apiUrl?.trim();
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = cc?.refreshInterval ?? 5;
  const maxItems = cc?.maxItems ?? 20;
  const rotationSeconds = cc?.rotationSeconds ?? 8;
  const refreshMs = refreshInterval * 60 * 1000;

  const [items, setItems] = useState<Confession[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const fetchData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data } = await fetchJsonWithCache<Confession[]>(fetchUrl, {
        cacheKey: buildCacheKey('confessions', apiUrl),
        ttlMs: refreshMs,
      });
      setItems(data.slice(0, maxItems));
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

  const advance = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(items.length, 1));
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [items.length, fadeAnim]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(advance, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [items.length, rotationSeconds, advance]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 400, h: 280 }, portrait: { w: 280, h: 380 } },
  );

  if (!apiUrl) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="megaphone" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>No source configured</Text>
      </View>
    );
  }

  const current = items[currentIndex % Math.max(items.length, 1)];

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={s.header}>
          <AppIcon name="megaphone" size={20} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Confessions</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {items.length === 0 && !error && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No confessions yet</Text>
          </View>
        )}

        {current && (
          <View style={s.content}>
            <Animated.View style={[s.confessionCard, { opacity: fadeAnim }]}>
              <Text style={s.quoteOpen}>&ldquo;</Text>
              <Text style={s.confessionText}>{current.text}</Text>
              {current.timestamp && (
                <Text style={s.timestamp}>{current.timestamp}</Text>
              )}
            </Animated.View>

            {items.length > 1 && (
              <View style={s.dots}>
                {items.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.dot,
                      { backgroundColor: i === currentIndex % items.length ? theme.accent : 'rgba(255,255,255,0.3)' },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  confessionCard: { paddingVertical: 8 },
  quoteOpen: { fontSize: 36, color: 'rgba(255,255,255,0.2)', lineHeight: 40, marginBottom: -8 },
  confessionText: { color: 'white', fontSize: 16, lineHeight: 24, fontStyle: 'italic' },
  timestamp: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
});

registerWidget({
  type: 'confessions',
  name: 'Confessions',
  description: 'Display rotating anonymous confessions',
  icon: 'megaphone',
  minW: 3, minH: 2, defaultW: 4, defaultH: 3,
  component: Confessions,
  defaultProps: { apiUrl: '', corsProxy: '', refreshInterval: 5, maxItems: 20, rotationSeconds: 8 },
});
