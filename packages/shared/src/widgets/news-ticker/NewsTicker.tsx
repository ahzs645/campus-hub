import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { fetchJsonWithCache, fetchTextWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface TickerItem { id: string | number; text: string; category?: string; }
interface NewsTickerConfig {
  items?: TickerItem[]; apiUrl?: string; speed?: number; label?: string;
  corsProxy?: string; sourceType?: 'json' | 'rss'; refreshInterval?: number;
  showLabel?: boolean; direction?: 'left' | 'right';
}

const DEFAULT_ITEMS: TickerItem[] = [
  { id: 1, text: 'Welcome to Campus Hub — your digital signage platform' },
  { id: 2, text: 'Spring semester registration opens March 1st' },
  { id: 3, text: 'Library hours extended during finals week' },
];

function parseRssToTicker(text: string): TickerItem[] {
  const items: TickerItem[] = [];
  const itemBlocks = text.split('<item');
  for (let i = 1; i < itemBlocks.length; i++) {
    const block = itemBlocks[i].split('</item')[0];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    if (title) items.push({ id: `rss-${i}`, text: title });
  }
  return items;
}

export default function NewsTicker({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const nc = config as NewsTickerConfig | undefined;
  const speed = nc?.speed ?? 50;
  const label = nc?.label ?? 'NEWS';
  const showLabel = nc?.showLabel ?? true;
  const direction = nc?.direction ?? 'left';
  const corsProxy = nc?.corsProxy?.trim() || globalCorsProxy;

  const [items, setItems] = useState<TickerItem[]>(nc?.items ?? DEFAULT_ITEMS);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Data fetching
  useEffect(() => {
    if (!nc?.apiUrl) { setItems(nc?.items ?? DEFAULT_ITEMS); return; }
    let isMounted = true;
    const fetchData = async () => {
      try {
        const fetchUrl = buildProxyUrl(corsProxy, nc.apiUrl!);
        if (nc.sourceType === 'rss') {
          const { text } = await fetchTextWithCache(fetchUrl, {
            cacheKey: buildCacheKey('ticker-rss', fetchUrl),
            ttlMs: (nc.refreshInterval ?? 5) * 60 * 1000,
          });
          const parsed = parseRssToTicker(text);
          if (isMounted && parsed.length > 0) setItems(parsed);
        } else {
          const { data } = await fetchJsonWithCache<TickerItem[] | { items: TickerItem[] }>(fetchUrl, {
            cacheKey: buildCacheKey('ticker-json', fetchUrl),
            ttlMs: (nc.refreshInterval ?? 5) * 60 * 1000,
          });
          const list = Array.isArray(data) ? data : data.items;
          if (isMounted && Array.isArray(list) && list.length > 0) setItems(list);
        }
      } catch (err) { console.error('Ticker fetch failed:', err); }
    };
    fetchData();
    const interval = setInterval(fetchData, (nc.refreshInterval ?? 5) * 60 * 1000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [nc?.apiUrl, nc?.sourceType, nc?.refreshInterval, corsProxy, nc?.items]);

  // Scrolling animation
  const tickerText = items.map(i => i.text).join('  •  ');
  const estimatedTextWidth = tickerText.length * 10; // rough estimate

  useEffect(() => {
    if (items.length === 0) return;
    const startPos = direction === 'left' ? width : -estimatedTextWidth;
    const endPos = direction === 'left' ? -estimatedTextWidth : width;
    const distance = Math.abs(startPos - endPos);
    const duration = (distance / speed) * 1000;

    translateX.setValue(startPos);
    const anim = Animated.loop(
      Animated.timing(translateX, { toValue: endPos, duration, easing: Easing.linear, useNativeDriver: true }),
    );
    animRef.current = anim;
    anim.start();
    return () => { anim.stop(); };
  }, [items, speed, width, direction, estimatedTextWidth]);

  return (
    <View style={[s.container, { width, height }]}>
      {showLabel && (
        <View style={[s.labelBox, { backgroundColor: theme.accent }]}>
          <AppIcon name="newspaper" size={14} color="white" />
          <Text style={s.labelText}>{label}</Text>
        </View>
      )}
      <View style={s.tickerArea}>
        <Animated.View style={[s.tickerContent, { transform: [{ translateX }] }]}>
          <Text style={s.tickerText} numberOfLines={1}>
            {tickerText}  •  {tickerText}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  labelBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, height: '100%' },
  labelText: { color: 'white', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  tickerArea: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  tickerContent: { flexDirection: 'row' },
  tickerText: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '500' },
});

registerWidget({
  type: 'news-ticker',
  name: 'News Ticker',
  description: 'Scrolling news and announcements',
  icon: 'newspaper',
  minW: 4, minH: 1, defaultW: 12, defaultH: 1,
  component: NewsTicker,
  defaultProps: { speed: 50, label: 'NEWS', showLabel: true, direction: 'left' },
});
