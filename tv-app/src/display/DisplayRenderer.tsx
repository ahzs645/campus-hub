import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { DisplayConfig, WidgetConfig, DEFAULT_CONFIG } from './types';
import { ClockWidget } from './widgets/ClockWidget';
import { PosterCarouselWidget } from './widgets/PosterCarouselWidget';
import { EventsListWidget } from './widgets/EventsListWidget';
import { NewsTickerWidget } from './widgets/NewsTickerWidget';
import { PlaceholderWidget } from './widgets/PlaceholderWidget';

interface Props {
  config?: DisplayConfig;
  configUrl?: string;
}

function getWidgetComponent(type: string) {
  switch (type) {
    case 'clock':
      return ClockWidget;
    case 'poster-carousel':
      return PosterCarouselWidget;
    case 'events-list':
      return EventsListWidget;
    case 'news-ticker':
      return NewsTickerWidget;
    default:
      return PlaceholderWidget;
  }
}

export function DisplayRenderer({ config: propConfig, configUrl }: Props) {
  const [config, setConfig] = useState<DisplayConfig>(
    propConfig || DEFAULT_CONFIG,
  );
  const [screenSize, setScreenSize] = useState(Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenSize(window);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (configUrl) {
      fetch(configUrl)
        .then((r) => r.json())
        .then((data) => setConfig(data))
        .catch(() => {});
    }
  }, [configUrl]);

  useEffect(() => {
    if (propConfig) setConfig(propConfig);
  }, [propConfig]);

  const gridCols = config.gridCols ?? 12;
  const gridRows = config.gridRows ?? 8;
  const { width: screenW, height: screenH } = screenSize;

  // Calculate grid dimensions with margin
  const margin = Math.max(2, Math.round(screenH * 0.0075));
  const gap = margin * 2;
  const totalW = screenW - margin * 2;
  const totalH = screenH - margin * 2;
  const cellW = (totalW - gap * (gridCols - 1)) / gridCols;
  const cellH = (totalH - gap * (gridRows - 1)) / gridRows;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.theme.background },
      ]}
    >
      <View style={[styles.grid, { margin }]}>
        {config.layout.map((widget) => {
          const Component = getWidgetComponent(widget.type);
          const left = widget.x * (cellW + gap);
          const top = widget.y * (cellH + gap);
          const width = widget.w * cellW + (widget.w - 1) * gap;
          const height = widget.h * cellH + (widget.h - 1) * gap;

          return (
            <View
              key={widget.id}
              style={[
                styles.widget,
                {
                  left,
                  top,
                  width,
                  height,
                },
              ]}
            >
              <Component
                config={widget.props}
                theme={config.theme}
                corsProxy={config.corsProxy}
                width={width}
                height={height}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grid: {
    flex: 1,
    position: 'relative',
  },
  widget: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 8,
  },
});
