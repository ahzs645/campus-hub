// Cross-platform widget renderer
// Looks up the widget component by type from the registry and renders it
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getWidgetComponent } from '../lib/widget-registry';
import type { ThemeColors } from '../lib/types';

interface WidgetRendererProps {
  type: string;
  config?: Record<string, unknown>;
  theme: ThemeColors;
  corsProxy?: string;
  width: number;
  height: number;
}

export default function WidgetRenderer({ type, config, theme, corsProxy, width, height }: WidgetRendererProps) {
  const Component = getWidgetComponent(type);

  if (!Component) {
    return (
      <View style={[s.placeholder, { backgroundColor: `${theme.primary}30` }]}>
        <Text style={s.placeholderText}>Unknown: {type}</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Component config={config} theme={theme} corsProxy={corsProxy} width={width} height={height} />
    </View>
  );
}

const s = StyleSheet.create({
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  placeholderText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});
