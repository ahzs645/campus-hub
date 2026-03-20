import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { WidgetComponentProps } from '../types';

interface Poster {
  image: string;
  title: string;
  subtitle?: string;
}

const DEFAULT_POSTERS: Poster[] = [
  {
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&h=800&fit=crop',
    title: 'Welcome to Campus',
    subtitle: 'Your hub for everything happening on campus',
  },
  {
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=1200&h=800&fit=crop',
    title: 'Spring Events',
    subtitle: 'Check out what\'s coming up this season',
  },
  {
    image: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=1200&h=800&fit=crop',
    title: 'Student Life',
    subtitle: 'Get involved in campus activities',
  },
];

export function PosterCarouselWidget({
  config,
  theme,
  width,
  height,
  corsProxy,
}: WidgetComponentProps) {
  const rotationSeconds = (config?.rotationSeconds as number) ?? 10;
  const apiUrl = config?.apiUrl as string | undefined;
  const dataSource = (config?.dataSource as string) ?? 'default';

  const [posters, setPosters] = useState<Poster[]>(
    (config?.posters as Poster[]) ?? DEFAULT_POSTERS,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Fetch posters from API
  useEffect(() => {
    if (dataSource === 'api' && apiUrl) {
      const url = corsProxy ? `${corsProxy}${encodeURIComponent(apiUrl)}` : apiUrl;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : data.posters || [];
          if (items.length > 0) setPosters(items);
        })
        .catch(() => {});
    }
  }, [apiUrl, dataSource, corsProxy]);

  // Auto-rotate
  useEffect(() => {
    if (posters.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((i) => (i + 1) % posters.length);
        // Reset scale for Ken Burns
        scaleAnim.setValue(1);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, rotationSeconds * 1000);

    return () => clearInterval(interval);
  }, [posters.length, rotationSeconds, fadeAnim, scaleAnim]);

  // Ken Burns slow zoom
  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1.08,
      duration: rotationSeconds * 1000,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, rotationSeconds, scaleAnim]);

  const poster = posters[currentIndex];
  if (!poster) return null;

  const titleSize = Math.min(height * 0.08, 36);
  const subtitleSize = titleSize * 0.6;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={{ uri: poster.image }}
          style={styles.image}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Gradient overlays */}
      <View style={styles.gradientBottom} />
      <View style={styles.gradientLeft} />

      {/* Text overlay */}
      <Animated.View style={[styles.textOverlay, { opacity: fadeAnim }]}>
        <Text
          style={[styles.title, { fontSize: titleSize }]}
          numberOfLines={2}
        >
          {poster.title}
        </Text>
        {poster.subtitle && (
          <Text
            style={[styles.subtitle, { fontSize: subtitleSize }]}
            numberOfLines={2}
          >
            {poster.subtitle}
          </Text>
        )}
      </Animated.View>

      {/* Progress dots */}
      {posters.length > 1 && (
        <View style={styles.dots}>
          {posters.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex
                      ? theme.accent
                      : 'rgba(255,255,255,0.3)',
                  width: i === currentIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Accent corner */}
      <View
        style={[
          styles.accentCorner,
          { backgroundColor: theme.accent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderRadius: 8,
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'transparent',
    // Simulating gradient with a semi-transparent overlay
    // RN doesn't have CSS gradients, so we use a dark overlay
    opacity: 0.8,
    // We'll layer this properly
  },
  gradientLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: 'transparent',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    // Dark gradient effect via background
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  accentCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 4,
    borderBottomLeftRadius: 4,
    opacity: 0.8,
  },
});
