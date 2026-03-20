import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface Poster {
  id: string;
  title: string;
  image: string;
}

interface PosterFeedConfig {
  apiUrl?: string;
  posters?: Poster[];
  rotationSeconds?: number;
  corsProxy?: string;
}

const DEFAULT_POSTERS: Poster[] = [
  { id: '1', title: 'Welcome Week 2026', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=800&fit=crop' },
  { id: '2', title: 'Student Art Show', image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=600&h=800&fit=crop' },
  { id: '3', title: 'Music Festival', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=800&fit=crop' },
];

export default function PosterFeed({ config, theme, width, height }: WidgetComponentProps) {
  const cc = config as PosterFeedConfig | undefined;
  const rotationSeconds = cc?.rotationSeconds ?? 8;
  const apiUrl = cc?.apiUrl;

  const [posters, setPosters] = useState<Poster[]>(cc?.posters ?? DEFAULT_POSTERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState<string | null>(null);

  // Fetch posters from API if configured
  useEffect(() => {
    if (!apiUrl) {
      setPosters(cc?.posters ?? DEFAULT_POSTERS);
      return;
    }
    let cancelled = false;
    const fetchPosters = async () => {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setPosters(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to load posters');
      }
    };
    fetchPosters();
    const interval = setInterval(fetchPosters, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [apiUrl, cc?.posters]);

  const nextPoster = useCallback(() => {
    if (posters.length <= 1) return;
    // Animate current card sliding up and fading
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIndex(prev => (prev + 1) % posters.length);
      slideAnim.setValue(20);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [posters.length, fadeAnim, slideAnim]);

  useEffect(() => {
    if (posters.length <= 1) return;
    const interval = setInterval(nextPoster, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [posters.length, rotationSeconds, nextPoster]);

  if (posters.length === 0) {
    return (
      <View style={[s.container, s.empty, { backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="image" size={32} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>{error ?? 'No posters available'}</Text>
      </View>
    );
  }

  const current = posters[currentIndex];
  const nextIdx = (currentIndex + 1) % posters.length;
  const prevIdx = (currentIndex - 1 + posters.length) % posters.length;

  return (
    <View style={[s.container, { width, height, backgroundColor: `${theme.primary}20` }]}>
      {/* Background stacked cards for depth effect */}
      {posters.length > 2 && (
        <View style={[s.stackCard, s.stackBack, { borderColor: `${theme.accent}30` }]}>
          <Image source={{ uri: posters[prevIdx].image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </View>
      )}
      {posters.length > 1 && (
        <View style={[s.stackCard, s.stackMiddle, { borderColor: `${theme.accent}40` }]}>
          <Image source={{ uri: posters[nextIdx].image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        </View>
      )}
      {/* Top card with animation */}
      <Animated.View
        style={[
          s.stackCard,
          s.stackFront,
          { borderColor: `${theme.accent}60`, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Image source={{ uri: current.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, s.overlay]} />
        <View style={s.cardContent}>
          <Text style={s.title} numberOfLines={2}>{current.title}</Text>
        </View>
      </Animated.View>
      {/* Counter */}
      {posters.length > 1 && (
        <View style={[s.counter, { backgroundColor: `${theme.primary}CC` }]}>
          <Text style={s.counterText}>{currentIndex + 1}/{posters.length}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  stackCard: {
    position: 'absolute',
    left: '8%' as unknown as number,
    right: '8%' as unknown as number,
    top: '8%' as unknown as number,
    bottom: '8%' as unknown as number,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  stackBack: { transform: [{ scale: 0.88 }, { translateY: -12 }] },
  stackMiddle: { transform: [{ scale: 0.94 }, { translateY: -6 }] },
  stackFront: { transform: [{ scale: 1 }] },
  overlay: { backgroundColor: 'rgba(0,0,0,0.3)' },
  cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  title: { color: 'white', fontSize: 18, fontWeight: '700' },
  counter: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  counterText: { color: 'white', fontSize: 12, fontWeight: '600' },
});

registerWidget({
  type: 'poster-feed',
  name: 'Poster Feed',
  description: 'Card-stack display of rotating posters',
  icon: 'image',
  minW: 3, minH: 3, defaultW: 4, defaultH: 4,
  component: PosterFeed,
  defaultProps: { rotationSeconds: 8 },
});
