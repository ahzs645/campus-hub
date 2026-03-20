import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Pressable } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { fetchTextWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';

interface Poster { id: string | number; title: string; subtitle?: string; image: string; }
type DataSource = 'default' | 'api' | 'unbc-news';
interface PosterCarouselConfig {
  rotationSeconds?: number; apiUrl?: string; posters?: Poster[];
  dataSource?: DataSource; maxStories?: number; corsProxy?: string; refreshInterval?: number;
}

const DEFAULT_POSTERS: Poster[] = [
  { id: 1, title: 'Spring Festival 2025', subtitle: 'March 15-17 | Main Quad', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop' },
  { id: 2, title: 'Career Fair', subtitle: 'Meet 50+ employers | March 20', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop' },
  { id: 3, title: 'Basketball Championship', subtitle: 'Finals this Saturday | 7PM', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop' },
  { id: 4, title: 'Art Exhibition Opening', subtitle: 'Student Gallery | Free Entry', image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=600&fit=crop' },
];

const UNBC_NEWS_URL = 'https://www.unbc.ca/our-stories/releases';

const parseUNBCNewsPage = (html: string, maxStories: number): Poster[] => {
  const posters: Poster[] = [];
  const storyPattern = /<a\s+href="(\/our-stories\/story\/[^"]+)"[^>]*>\s*<img\s+[^>]*src="([^"]+)"[^>]*\/?\s*>\s*<\/a>[\s\S]*?<h3>\s*<a\s+href="\/our-stories\/story\/[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/h3>/gi;
  let match: RegExpExecArray | null;
  while ((match = storyPattern.exec(html)) !== null && posters.length < maxStories) {
    const imageSrc = match[2];
    const title = match[3].replace(/<[^>]*>/g, '').trim();
    if (!title || !imageSrc) continue;
    const imageUrl = imageSrc.startsWith('http') ? imageSrc : `https://www.unbc.ca${imageSrc}`;
    const afterH3 = html.substring(match.index + match[0].length, match.index + match[0].length + 200);
    const dateMatch = afterH3.match(/([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/);
    posters.push({ id: match[1], title, subtitle: dateMatch ? dateMatch[1] : undefined, image: imageUrl });
  }
  return posters;
};

export default function PosterCarousel({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as PosterCarouselConfig | undefined;
  const rotationSeconds = cc?.rotationSeconds ?? 10;
  const dataSource = cc?.dataSource ?? 'default';
  const apiUrl = cc?.apiUrl;
  const maxStories = cc?.maxStories ?? 5;
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy || '';
  const refreshInterval = cc?.refreshInterval ?? 30;

  const [posters, setPosters] = useState<Poster[]>(cc?.posters ?? DEFAULT_POSTERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataSource !== 'default') return;
    setPosters(cc?.posters ?? DEFAULT_POSTERS);
    setCurrentIndex(0); setProgress(0); setError(null);
  }, [dataSource, cc?.posters]);

  useEffect(() => {
    if (dataSource !== 'api' || !apiUrl) return;
    const fetchPosters = async () => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) { setPosters(data); setError(null); }
      } catch { setError('Failed to load posters from API'); }
    };
    fetchPosters();
    const interval = setInterval(fetchPosters, 60000);
    return () => clearInterval(interval);
  }, [dataSource, apiUrl]);

  useEffect(() => {
    if (dataSource !== 'unbc-news') return;
    const fetchNews = async () => {
      try {
        const proxiedUrl = buildProxyUrl(corsProxy, UNBC_NEWS_URL);
        const { text } = await fetchTextWithCache(proxiedUrl, { cacheKey: buildCacheKey('unbc-news', UNBC_NEWS_URL), ttlMs: refreshInterval * 60 * 1000, allowStale: true });
        const stories = parseUNBCNewsPage(text, maxStories);
        if (stories.length > 0) { setPosters(stories); setCurrentIndex(0); setProgress(0); setError(null); }
        else { setError('No stories found'); }
      } catch { setError('Failed to load UNBC news'); }
    };
    fetchNews();
    const interval = setInterval(fetchNews, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [dataSource, corsProxy, maxStories, refreshInterval]);

  // Ken Burns animation
  useEffect(() => {
    scaleAnim.setValue(1);
    Animated.timing(scaleAnim, { toValue: 1.1, duration: rotationSeconds * 1000, useNativeDriver: true }).start();
  }, [currentIndex, rotationSeconds]);

  const nextSlide = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
      setCurrentIndex(prev => (prev + 1) % posters.length);
      setProgress(0);
      fadeAnim.setValue(1);
    });
  }, [posters.length, fadeAnim]);

  useEffect(() => {
    if (posters.length <= 1) return;
    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 100 ? 100 : prev + 100 / (rotationSeconds * 10));
    }, 100);
    const rotationInterval = setInterval(nextSlide, rotationSeconds * 1000);
    return () => { clearInterval(progressInterval); clearInterval(rotationInterval); };
  }, [posters.length, rotationSeconds, nextSlide]);

  const current = posters[currentIndex];
  if (!current) {
    return (
      <View style={[s.empty, { backgroundColor: `${theme.primary}40` }]}>
        <Text style={s.emptyText}>{error ?? 'No posters available'}</Text>
      </View>
    );
  }

  return (
    <View style={[s.root, { width, height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Animated.Image
          source={{ uri: current.image }}
          style={[StyleSheet.absoluteFill, { transform: [{ scale: scaleAnim }] }]}
          resizeMode="cover"
        />
      </Animated.View>
      {/* Gradient overlays */}
      <View style={[StyleSheet.absoluteFill, s.gradientBottom]} />
      <View style={[StyleSheet.absoluteFill, s.gradientLeft]} />
      {/* Content */}
      <View style={s.content}>
        <Text style={s.title}>{current.title}</Text>
        {current.subtitle && <Text style={s.subtitle}>{current.subtitle}</Text>}
      </View>
      {/* Progress dots */}
      {posters.length > 1 && (
        <View style={s.dots}>
          {posters.map((_, idx) => (
            <Pressable key={idx} onPress={() => { setCurrentIndex(idx); setProgress(0); }}>
              <View style={[s.dot, {
                backgroundColor: idx === currentIndex ? theme.accent : 'rgba(255,255,255,0.4)',
                transform: [{ scale: idx === currentIndex ? 1.2 : 1 }],
              }]} />
            </Pressable>
          ))}
        </View>
      )}
      {/* Progress bar */}
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${progress}%` as unknown as number, backgroundColor: theme.accent }]} />
      </View>
      {/* Corner accent */}
      <View style={[s.cornerAccent, { backgroundColor: `${theme.accent}40` }]} />
      {dataSource === 'unbc-news' && (
        <View style={[s.badge, { backgroundColor: `${theme.primary}99` }]}>
          <Text style={s.badgeText}>UNBC News</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  empty: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.5)' },
  gradientBottom: { backgroundColor: 'rgba(0,0,0,0.5)' },
  gradientLeft: { backgroundColor: 'rgba(0,0,0,0.15)' },
  content: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32 },
  title: { fontSize: 36, fontWeight: '700', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 20, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  dots: { position: 'absolute', bottom: 24, right: 24, flexDirection: 'row', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  progressBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.3)' },
  progressFill: { height: '100%' },
  cornerAccent: { position: 'absolute', top: 0, left: 0, width: 96, height: 96, opacity: 0.5 },
  badge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
});

registerWidget({
  type: 'poster-carousel',
  name: 'Poster Carousel',
  description: 'Rotating display of event posters and announcements',
  icon: 'carousel',
  minW: 4, minH: 3, defaultW: 8, defaultH: 5,
  component: PosterCarousel,
  defaultProps: { rotationSeconds: 10 },
});
