// Cross-platform display grid using absolute positioning
// Works identically on web (via react-native-web) and tvOS (via react-native-tvos)
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { DisplayConfig, WidgetConfig, ThemeColors } from '../lib/types';
import { getWidgetComponent } from '../lib/widget-registry';

interface DisplayGridProps {
  config: DisplayConfig;
  width: number;
  height: number;
}

interface WidgetSlotProps {
  widget: WidgetConfig;
  theme: ThemeColors;
  corsProxy?: string;
  cellW: number;
  cellH: number;
  gap: number;
}

function WidgetSlot({ widget, theme, corsProxy, cellW, cellH, gap }: WidgetSlotProps) {
  const Component = getWidgetComponent(widget.type);
  const left = widget.x * (cellW + gap);
  const top = widget.y * (cellH + gap);
  const w = widget.w * cellW + (widget.w - 1) * gap;
  const h = widget.h * cellH + (widget.h - 1) * gap;

  return (
    <View
      style={[
        styles.widgetSlot,
        {
          left,
          top,
          width: w,
          height: h,
          backgroundColor:
            widget.type === 'events-list' || widget.type === 'clock'
              ? `${theme.primary}40`
              : undefined,
        },
      ]}
    >
      {Component ? (
        <Component
          config={widget.props}
          theme={theme}
          corsProxy={corsProxy}
          width={w}
          height={h}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: `${theme.primary}30` }]} />
      )}
    </View>
  );
}

export default function DisplayGrid({ config, width, height }: DisplayGridProps) {
  const gridRows = config.gridRows ?? 8;
  const gridCols = config.gridCols ?? 12;
  const gap = Math.max(2, Math.round(height * 0.0075)) * 2;
  const margin = Math.max(2, Math.round(height * 0.0075));

  const layout = useMemo(() => {
    const items = [...config.layout];
    if (config.tickerEnabled && !items.some(w => w.type === 'news-ticker')) {
      items.push({
        id: 'default-ticker',
        type: 'news-ticker',
        x: 0,
        y: gridRows - 1,
        w: gridCols,
        h: 1,
      });
    }
    return items;
  }, [config, gridRows, gridCols]);

  const innerW = width - margin * 2;
  const innerH = height - margin * 2;
  const cellW = (innerW - gap * (gridCols - 1)) / gridCols;
  const cellH = (innerH - gap * (gridRows - 1)) / gridRows;

  return (
    <View style={[styles.container, { width, height, backgroundColor: config.theme.background }]}>
      <View style={[styles.inner, { marginLeft: margin, marginTop: margin, width: innerW, height: innerH }]}>
        {layout.map(widget => (
          <WidgetSlot
            key={widget.id}
            widget={widget}
            theme={config.theme}
            corsProxy={config.corsProxy}
            cellW={cellW}
            cellH={cellH}
            gap={gap}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  inner: {
    position: 'relative',
  },
  widgetSlot: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    borderRadius: 12,
  },
});
