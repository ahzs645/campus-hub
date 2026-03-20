import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget, getWidgetComponent } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface ChildWidgetConfig {
  type: string;
  props?: Record<string, unknown>;
}

interface WidgetStackConfig {
  widgets?: ChildWidgetConfig[];
  rotationSeconds?: number;
}

export default function WidgetStack({ config, theme, corsProxy, width, height }: WidgetComponentProps) {
  const cc = config as WidgetStackConfig | undefined;
  const widgets = cc?.widgets ?? [];
  const rotationSeconds = cc?.rotationSeconds ?? 10;

  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const nextWidget = useCallback(() => {
    if (widgets.length <= 1) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setCurrentIndex(prev => (prev + 1) % widgets.length);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [widgets.length, fadeAnim]);

  useEffect(() => {
    if (widgets.length <= 1) return;
    const interval = setInterval(nextWidget, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [widgets.length, rotationSeconds, nextWidget]);

  // Reset index if widgets change
  useEffect(() => {
    setCurrentIndex(0);
    fadeAnim.setValue(1);
  }, [widgets.length, fadeAnim]);

  if (widgets.length === 0) {
    return (
      <View style={[s.container, s.centered, { width, height, backgroundColor: `${theme.primary}20` }]}>
        <AppIcon name="layers" size={32} color="rgba(255,255,255,0.3)" />
        <Text style={s.emptyText}>No widgets configured</Text>
      </View>
    );
  }

  const currentWidget = widgets[currentIndex];
  const ChildComponent = currentWidget ? getWidgetComponent(currentWidget.type) : null;

  return (
    <View style={[s.container, { width, height, backgroundColor: `${theme.primary}20` }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        {ChildComponent ? (
          <ChildComponent
            config={currentWidget?.props}
            theme={theme}
            corsProxy={corsProxy}
            width={width}
            height={height}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.centered]}>
            <AppIcon name="layers" size={24} color="rgba(255,255,255,0.3)" />
            <Text style={s.errorText}>Unknown widget: {currentWidget?.type}</Text>
          </View>
        )}
      </Animated.View>
      {/* Navigation dots */}
      {widgets.length > 1 && (
        <View style={s.dotsContainer}>
          {widgets.map((_, idx) => (
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
  errorText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  dotsContainer: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

registerWidget({
  type: 'widget-stack',
  name: 'Widget Stack',
  description: 'Cycles through multiple widget types with fade transitions',
  icon: 'layers',
  minW: 2, minH: 2, defaultW: 4, defaultH: 3,
  component: WidgetStack,
  defaultProps: { widgets: [], rotationSeconds: 10 },
});
