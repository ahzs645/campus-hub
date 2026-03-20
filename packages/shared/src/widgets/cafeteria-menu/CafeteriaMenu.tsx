import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface CafeteriaMenuConfig {
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
  title?: string;
  dataSource?: 'json' | 'html';
}

interface MenuItem {
  name: string;
  category?: string;
  price?: string;
  description?: string;
}

interface GroupedItems {
  category: string;
  items: MenuItem[];
}

const groupByCategory = (items: MenuItem[]): GroupedItems[] => {
  const map = new Map<string, MenuItem[]>();
  for (const item of items) {
    const cat = item.category || 'Other';
    const existing = map.get(cat);
    if (existing) {
      existing.push(item);
    } else {
      map.set(cat, [item]);
    }
  }
  return Array.from(map.entries()).map(([category, catItems]) => ({ category, items: catItems }));
};

export default function CafeteriaMenu({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const mc = config as CafeteriaMenuConfig | undefined;
  const apiUrl = mc?.apiUrl?.trim();
  const corsProxy = mc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = mc?.refreshInterval ?? 30;
  const title = mc?.title || "Today's Menu";
  const refreshMs = refreshInterval * 60 * 1000;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
      const { data } = await fetchJsonWithCache<MenuItem[]>(fetchUrl, {
        cacheKey: buildCacheKey('cafeteria-menu', apiUrl),
        ttlMs: refreshMs,
      });
      setMenuItems(data);
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
    { landscape: { w: 420, h: 380 }, portrait: { w: 300, h: 500 } },
  );

  if (!apiUrl) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="utensils" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>No menu configured</Text>
      </View>
    );
  }

  const grouped = groupByCategory(menuItems);

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={s.header}>
          <AppIcon name="utensils" size={20} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>{title}</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {menuItems.length === 0 && !error && (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No menu items available</Text>
          </View>
        )}

        {grouped.map((group) => (
          <View key={group.category} style={s.categorySection}>
            <Text style={[s.categoryTitle, { color: theme.accent }]}>{group.category}</Text>
            {group.items.map((item, index) => (
              <View key={`${item.name}-${index}`} style={[s.menuRow, index < group.items.length - 1 && s.menuRowBorder]}>
                <View style={s.menuInfo}>
                  <Text style={s.menuName} numberOfLines={1}>{item.name}</Text>
                  {item.description && (
                    <Text style={s.menuDescription} numberOfLines={1}>{item.description}</Text>
                  )}
                </View>
                {item.price && (
                  <Text style={s.menuPrice}>{item.price}</Text>
                )}
              </View>
            ))}
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
  categorySection: { marginBottom: 4 },
  categoryTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  menuInfo: { flex: 1 },
  menuName: { color: 'white', fontSize: 14, fontWeight: '500' },
  menuDescription: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 },
  menuPrice: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13, paddingHorizontal: 16, marginBottom: 4 },
});

registerWidget({
  type: 'cafeteria-menu',
  name: 'Cafeteria Menu',
  description: "Display today's cafeteria menu",
  icon: 'utensils',
  minW: 3, minH: 3, defaultW: 4, defaultH: 4,
  component: CafeteriaMenu,
  defaultProps: { apiUrl: '', corsProxy: '', refreshInterval: 30, title: "Today's Menu", dataSource: 'json' },
});
