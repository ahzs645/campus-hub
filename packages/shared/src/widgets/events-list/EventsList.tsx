import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Svg, Circle as SvgCircle, Path } from 'react-native-svg';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { useEvents } from '../../hooks/useEvents';
import type { CalendarEvent } from '../../hooks/useEvents';

interface EventsListConfig {
  events?: CalendarEvent[];
  apiUrl?: string;
  sourceType?: 'json' | 'ical' | 'rss';
  maxItems?: number;
  showTime?: boolean;
  showLocation?: boolean;
  showDate?: boolean;
  showIndex?: boolean;
  refreshInterval?: number;
  corsProxy?: string;
  displayMode?: 'scroll' | 'ticker';
  selectedCategories?: string[];
}

function CalendarIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgCircle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function LocationIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={color} strokeWidth={1.5} />
      <SvgCircle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export default function EventsList({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const ec = config as EventsListConfig | undefined;
  const showTime = ec?.showTime ?? true;
  const showLocation = ec?.showLocation ?? true;
  const showDate = ec?.showDate ?? true;
  const showIndex = ec?.showIndex ?? false;
  const displayMode = ec?.displayMode ?? 'scroll';
  const corsProxy = ec?.corsProxy?.trim() || globalCorsProxy;

  const events = useEvents({
    apiUrl: ec?.apiUrl,
    sourceType: ec?.sourceType ?? 'json',
    corsProxy,
    cacheTtlSeconds: (ec?.refreshInterval ?? 30),
    maxItems: ec?.maxItems ?? 10,
    pollIntervalMs: (ec?.refreshInterval ?? 30) * 1000,
    defaultEvents: ec?.events,
    selectedCategories: ec?.selectedCategories,
  });

  const { scale, designWidth: DW, designHeight: DH, isLandscape } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 400, h: 320 }, portrait: { w: 300, h: 400 } },
  );

  // Ticker mode
  const [tickerIndex, setTickerIndex] = useState(0);
  const tickerOpacity = useRef(new Animated.Value(1)).current;

  const advanceTicker = useCallback(() => {
    Animated.timing(tickerOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      setTickerIndex(prev => (prev + 1) % Math.max(events.length, 1));
      tickerOpacity.setValue(0);
      Animated.timing(tickerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [events.length, tickerOpacity]);

  useEffect(() => {
    if (displayMode !== 'ticker' || events.length <= 1) return;
    const interval = setInterval(advanceTicker, 5000);
    return () => clearInterval(interval);
  }, [displayMode, events.length, advanceTicker]);

  if (events.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <CalendarIcon color="rgba(255,255,255,0.4)" size={32} />
        <Text style={s.emptyText}>No upcoming events</Text>
      </View>
    );
  }

  if (displayMode === 'ticker') {
    const event = events[tickerIndex % events.length];
    return (
      <View style={[s.container, { justifyContent: 'center', paddingHorizontal: 24 }]}>
        <Animated.View style={{ opacity: tickerOpacity }}>
          <Text style={[s.tickerTitle, { color: theme.accent }]}>{event.title}</Text>
          {showDate && event.date && <Text style={s.tickerMeta}>{event.date}{showTime && event.time ? ` · ${event.time}` : ''}</Text>}
          {showLocation && event.location ? <Text style={s.tickerMeta}>{event.location}</Text> : null}
        </Animated.View>
        <View style={s.tickerDots}>
          {events.map((_, i) => (
            <View key={i} style={[s.tickerDot, { backgroundColor: i === tickerIndex % events.length ? theme.accent : 'rgba(255,255,255,0.3)' }]} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={{ width: DW, height: DH, transform: [{ scale }], transformOrigin: 'top left' }}>
        <View style={s.header}>
          <CalendarIcon color={theme.accent} size={20} />
          <Text style={[s.headerText, { color: theme.accent }]}>Upcoming Events</Text>
        </View>
        {events.map((event, index) => (
          <View key={event.id} style={[s.eventRow, index < events.length - 1 && s.eventRowBorder]}>
            {showIndex && (
              <View style={[s.indexBadge, { backgroundColor: event.color || theme.accent }]}>
                <Text style={s.indexText}>{index + 1}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
              <View style={s.eventMeta}>
                {showDate && event.date && (
                  <View style={s.metaItem}>
                    <CalendarIcon color="rgba(255,255,255,0.5)" size={12} />
                    <Text style={s.metaText}>{event.date}</Text>
                  </View>
                )}
                {showTime && event.time && (
                  <View style={s.metaItem}>
                    <ClockIcon color="rgba(255,255,255,0.5)" size={12} />
                    <Text style={s.metaText}>{event.time}</Text>
                  </View>
                )}
                {showLocation && event.location && (
                  <View style={s.metaItem}>
                    <LocationIcon color="rgba(255,255,255,0.5)" size={12} />
                    <Text style={s.metaText} numberOfLines={1}>{event.location}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  eventRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  eventTitle: { color: 'white', fontSize: 15, fontWeight: '600' },
  eventMeta: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  indexBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  indexText: { color: 'white', fontSize: 12, fontWeight: '700' },
  tickerTitle: { fontSize: 28, fontWeight: '700' },
  tickerMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 4 },
  tickerDots: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', gap: 6 },
  tickerDot: { width: 8, height: 8, borderRadius: 4 },
});

registerWidget({
  type: 'events-list',
  name: 'Events List',
  description: 'Display upcoming campus events',
  icon: 'calendar',
  minW: 3, minH: 2, defaultW: 4, defaultH: 3,
  component: EventsList,
  defaultProps: { showTime: true, showLocation: true, showDate: true, showIndex: false, displayMode: 'scroll', maxItems: 10, refreshInterval: 30 },
});
