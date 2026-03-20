import { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';

interface SlideshowConfig { images?: string[]; interval?: number; transition?: 'fade' | 'slide'; fit?: 'cover' | 'contain'; }

export default function Slideshow({ config, theme, width, height }: WidgetComponentProps) {
  const sc = config as SlideshowConfig | undefined;
  const images = sc?.images ?? [];
  const interval = (sc?.interval ?? 5) * 1000;
  const fit = sc?.fit ?? 'cover';

  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        setIndex(prev => (prev + 1) % images.length);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval, fadeAnim]);

  if (images.length === 0) {
    return (
      <View style={[s.empty, { backgroundColor: `${theme.primary}40` }]}>
        <Text style={s.emptyText}>No images configured</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { width, height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <Image source={{ uri: images[index] }} style={StyleSheet.absoluteFill} resizeMode={fit} />
      </Animated.View>
      <View style={s.overlay} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
});

registerWidget({
  type: 'slideshow', name: 'Slideshow', description: 'Image slideshow with transitions',
  icon: 'slideshow', minW: 2, minH: 2, defaultW: 4, defaultH: 3, component: Slideshow,
  defaultProps: { images: [], interval: 5, transition: 'fade', fit: 'cover' },
});
