import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface Club {
  name: string;
  description: string;
  image?: string;
  meetingTime?: string;
}

interface ClubSpotlightConfig {
  apiUrl?: string;
  corsProxy?: string;
  refreshInterval?: number;
  rotationSeconds?: number;
}

const DEFAULT_CLUBS: Club[] = [
  { name: 'Robotics Club', description: 'Build and program robots for competitions.', meetingTime: 'Tuesdays 5PM' },
  { name: 'Debate Society', description: 'Sharpen your public speaking and argumentation.', meetingTime: 'Wednesdays 6PM' },
  { name: 'Photography Club', description: 'Explore creative photography techniques.', meetingTime: 'Thursdays 4PM' },
];

export default function ClubSpotlight({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const cc = config as ClubSpotlightConfig | undefined;
  const apiUrl = cc?.apiUrl?.trim();
  const corsProxy = cc?.corsProxy?.trim() || globalCorsProxy;
  const refreshInterval = cc?.refreshInterval ?? 30;
  const rotationSeconds = cc?.rotationSeconds ?? 10;
  const refreshMs = refreshInterval * 60 * 1000;

  const [clubs, setClubs] = useState<Club[]>(DEFAULT_CLUBS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!apiUrl) return;
    let cancelled = false;
    const fetchClubs = async () => {
      try {
        const fetchUrl = buildProxyUrl(corsProxy, apiUrl);
        const { data } = await fetchJsonWithCache<Club[]>(fetchUrl, {
          cacheKey: buildCacheKey('clubs', apiUrl),
          ttlMs: refreshMs,
        });
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setClubs(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to load clubs');
      }
    };
    fetchClubs();
    const interval = setInterval(fetchClubs, refreshMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [apiUrl, corsProxy, refreshMs]);

  const nextClub = useCallback(() => {
    if (clubs.length <= 1) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setCurrentIndex(prev => (prev + 1) % clubs.length);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [clubs.length, fadeAnim]);

  useEffect(() => {
    if (clubs.length <= 1) return;
    const interval = setInterval(nextClub, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [clubs.length, rotationSeconds, nextClub]);

  if (clubs.length === 0) {
    return (
      <View style={[s.container, s.centered, { backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="users" size={32} color="rgba(255,255,255,0.4)" />
        <Text style={s.emptyText}>{error ?? 'No clubs available'}</Text>
      </View>
    );
  }

  const club = clubs[currentIndex];

  return (
    <View style={[s.container, { width, height, backgroundColor: `${theme.primary}20` }]}>
      <Animated.View style={[s.inner, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={s.header}>
          <AppIcon name="users" size={18} color={theme.accent} />
          <Text style={[s.headerLabel, { color: theme.accent }]}>Club Spotlight</Text>
          {clubs.length > 1 && (
            <Text style={s.headerCounter}>{currentIndex + 1}/{clubs.length}</Text>
          )}
        </View>
        {/* Club content */}
        <View style={s.body}>
          {club.image ? (
            <Image source={{ uri: club.image }} style={s.clubImage} resizeMode="cover" />
          ) : (
            <View style={[s.clubImagePlaceholder, { backgroundColor: `${theme.accent}30` }]}>
              <AppIcon name="users" size={28} color={theme.accent} />
            </View>
          )}
          <View style={s.info}>
            <Text style={s.clubName} numberOfLines={1}>{club.name}</Text>
            <Text style={s.clubDescription} numberOfLines={3}>{club.description}</Text>
            {club.meetingTime && (
              <View style={s.meetingRow}>
                <AppIcon name="clock" size={13} color="rgba(255,255,255,0.5)" />
                <Text style={s.meetingText}>{club.meetingTime}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
      {/* Dots */}
      {clubs.length > 1 && (
        <View style={s.dots}>
          {clubs.map((_, idx) => (
            <View
              key={idx}
              style={[s.dot, { backgroundColor: idx === currentIndex ? theme.accent : 'rgba(255,255,255,0.25)' }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  inner: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  headerCounter: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  body: { flex: 1, flexDirection: 'row', gap: 14 },
  clubImage: { width: 72, height: 72, borderRadius: 10 },
  clubImagePlaceholder: { width: 72, height: 72, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, justifyContent: 'center' },
  clubName: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  clubDescription: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },
  meetingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  meetingText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

registerWidget({
  type: 'club-spotlight',
  name: 'Club Spotlight',
  description: 'Rotating spotlight on campus clubs and organizations',
  icon: 'users',
  minW: 3, minH: 2, defaultW: 4, defaultH: 3,
  component: ClubSpotlight,
  defaultProps: { refreshInterval: 30, rotationSeconds: 10 },
});
