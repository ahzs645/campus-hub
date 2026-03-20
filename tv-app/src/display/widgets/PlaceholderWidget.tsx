import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WidgetComponentProps } from '../types';

export function PlaceholderWidget({ config, theme }: WidgetComponentProps) {
  return (
    <View style={[styles.container, { backgroundColor: `${theme.primary}15` }]}>
      <Text style={[styles.icon, { color: `${theme.accent}40` }]}>□</Text>
      <Text style={styles.text}>Widget not available on TV</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  text: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },
});
