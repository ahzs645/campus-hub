import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WidgetComponentProps } from '../types';

export function ClockWidget({ config, theme, width, height }: WidgetComponentProps) {
  const [time, setTime] = useState(new Date());
  const showSeconds = (config?.showSeconds as boolean) ?? false;
  const showDate = (config?.showDate as boolean) ?? true;
  const format24h = (config?.format24h as boolean) ?? false;
  const alignment = (config?.alignment as string) ?? 'right';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: !format24h,
  };

  const alignItems =
    alignment === 'left'
      ? 'flex-start'
      : alignment === 'center'
        ? 'center'
        : 'flex-end';

  const textAlign = alignment === 'left' ? 'left' : alignment === 'center' ? 'center' : 'right';

  // Scale font based on widget height
  const timeFontSize = Math.min(height * 0.5, width * 0.12);
  const dateFontSize = timeFontSize * 0.35;

  return (
    <View style={[styles.container, { alignItems }]}>
      <Text
        style={[
          styles.time,
          {
            color: theme.accent,
            fontSize: timeFontSize,
            textAlign,
          },
        ]}
      >
        {time.toLocaleTimeString([], timeOptions)}
      </Text>
      {showDate && (
        <Text
          style={[
            styles.date,
            {
              fontSize: dateFontSize,
              textAlign,
            },
          ]}
        >
          {time.toLocaleDateString([], {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  time: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  date: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
