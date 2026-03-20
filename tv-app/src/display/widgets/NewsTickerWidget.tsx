import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { WidgetComponentProps } from '../types';

interface TickerItem {
  text: string;
  label?: string;
}

const SAMPLE_ITEMS: TickerItem[] = [
  { text: 'Welcome to Campus Hub — Your digital signage solution' },
  { text: 'Spring semester registration is now open' },
  { text: 'Library hours extended during finals week' },
  { text: 'Campus shuttle schedule updated for March' },
  { text: 'Don\'t forget to check out the career fair tomorrow!' },
];

export function NewsTickerWidget({
  config,
  theme,
  width,
  height,
}: WidgetComponentProps) {
  const label = (config?.label as string) ?? 'Breaking';
  const speed = (config?.speed as number) ?? 30;
  const apiUrl = config?.apiUrl as string | undefined;
  const corsProxy = config?.corsProxy as string | undefined;

  const [items, setItems] = useState<TickerItem[]>(
    (config?.items as TickerItem[]) ?? SAMPLE_ITEMS,
  );
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  // Fetch items from API
  useEffect(() => {
    if (apiUrl) {
      const url = corsProxy
        ? `${corsProxy}${encodeURIComponent(apiUrl)}`
        : apiUrl;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          const fetched = Array.isArray(data)
            ? data
            : data.items || data.announcements || [];
          if (fetched.length > 0) {
            setItems(
              fetched.map((item: any) =>
                typeof item === 'string'
                  ? { text: item }
                  : { text: item.text || item.title, label: item.label },
              ),
            );
          }
        })
        .catch(() => {});
    }
  }, [apiUrl, corsProxy]);

  // Build the ticker text
  const tickerText = items.map((item) => item.text).join('     •     ');
  // Estimate content width (rough: ~10px per character at default size)
  const fontSize = Math.min(height * 0.35, 24);
  const estimatedWidth = tickerText.length * fontSize * 0.55;
  const totalScrollWidth = Math.max(estimatedWidth, width * 2);

  // Continuous scroll animation
  useEffect(() => {
    if (items.length === 0) return;

    scrollAnim.setValue(0);
    const duration = (totalScrollWidth / speed) * 1000;

    const animation = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -totalScrollWidth / 2,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => animation.stop();
  }, [items, speed, totalScrollWidth, scrollAnim]);

  const labelWidth = Math.min(width * 0.15, 140);

  return (
    <View style={[styles.container, { backgroundColor: `${theme.primary}30` }]}>
      {/* Label section */}
      <View style={[styles.labelContainer, { width: labelWidth, backgroundColor: theme.accent }]}>
        <View style={[styles.pulsingDot, { backgroundColor: '#fff' }]} />
        <Text
          style={[styles.labelText, { fontSize: fontSize * 0.75 }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {/* Scrolling content */}
      <View style={styles.scrollContainer}>
        <Animated.View
          style={[
            styles.scrollContent,
            {
              transform: [{ translateX: scrollAnim }],
            },
          ]}
        >
          {/* Render twice for seamless loop */}
          {[0, 1].map((copy) => (
            <View key={copy} style={styles.tickerRow}>
              {items.map((item, i) => (
                <React.Fragment key={`${copy}-${i}`}>
                  {i > 0 && (
                    <Text
                      style={[
                        styles.separator,
                        { fontSize, color: `${theme.accent}60` },
                      ]}
                    >
                      •
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.tickerText,
                      { fontSize },
                    ]}
                    numberOfLines={1}
                  >
                    {item.text}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 1,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },
  labelText: {
    color: '#fff',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContainer: {
    flex: 1,
    overflow: 'hidden',
    height: '100%',
    justifyContent: 'center',
  },
  scrollContent: {
    flexDirection: 'row',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  separator: {
    opacity: 0.5,
  },
  tickerText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
});
