import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WidgetComponentProps } from '../types';

interface EventItem {
  id: string | number;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  color?: string;
}

const EVENT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const SAMPLE_EVENTS: EventItem[] = [
  { id: 1, title: 'Student Council Meeting', date: 'Today', time: '2:00 PM', location: 'Room 204' },
  { id: 2, title: 'Career Fair', date: 'Tomorrow', time: '10:00 AM', location: 'Main Hall' },
  { id: 3, title: 'Guest Lecture: AI & Ethics', date: 'Mar 22', time: '3:30 PM', location: 'Auditorium' },
  { id: 4, title: 'Spring Festival', date: 'Mar 25', time: '12:00 PM', location: 'Campus Green' },
  { id: 5, title: 'Finals Study Group', date: 'Mar 28', time: '6:00 PM', location: 'Library' },
];

export function EventsListWidget({
  config,
  theme,
  width,
  height,
  corsProxy,
}: WidgetComponentProps) {
  const title = (config?.title as string) ?? 'Upcoming Events';
  const displayMode = (config?.displayMode as string) ?? 'scroll';
  const rotationSeconds = (config?.rotationSeconds as number) ?? 5;
  const apiUrl = config?.apiUrl as string | undefined;
  const maxItems = (config?.maxItems as number) ?? 10;

  const [events, setEvents] = useState<EventItem[]>(
    (config?.events as EventItem[]) ?? SAMPLE_EVENTS,
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch events from API
  useEffect(() => {
    if (apiUrl) {
      const url = corsProxy
        ? `${corsProxy}${encodeURIComponent(apiUrl)}`
        : apiUrl;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          const items = Array.isArray(data) ? data : data.events || [];
          if (items.length > 0) setEvents(items.slice(0, maxItems));
        })
        .catch(() => {});
    }
  }, [apiUrl, corsProxy, maxItems]);

  // Ticker mode: auto-advance
  useEffect(() => {
    if (displayMode !== 'ticker' || events.length <= 1) return;
    const interval = setInterval(() => {
      Animated.timing(slideAnim, {
        toValue: -1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((i) => (i + 1) % events.length);
        slideAnim.setValue(0);
      });
    }, rotationSeconds * 1000);
    return () => clearInterval(interval);
  }, [displayMode, events.length, rotationSeconds, slideAnim]);

  const headerHeight = 48;
  const cardHeight = Math.min(120, (height - headerHeight) / Math.min(events.length, 5));
  const cardGap = 8;
  const fontSize = Math.min(cardHeight * 0.2, 16);

  const visibleEvents =
    displayMode === 'ticker'
      ? [events[currentIndex]].filter(Boolean)
      : events.slice(0, Math.floor((height - headerHeight) / (cardHeight + cardGap)));

  return (
    <View style={[styles.container, { backgroundColor: `${theme.primary}20` }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerAccent, { backgroundColor: theme.accent }]} />
        <Text style={[styles.headerText, { fontSize: fontSize * 1.1 }]}>
          {title}
        </Text>
        <Text style={styles.headerCount}>{events.length} events</Text>
      </View>

      {/* Events */}
      <View style={styles.list}>
        {visibleEvents.map((event, i) => {
          const color =
            event.color || EVENT_COLORS[i % EVENT_COLORS.length];
          return (
            <Animated.View
              key={event.id}
              style={[
                styles.card,
                {
                  height: cardHeight - cardGap,
                  borderLeftColor: color,
                  transform:
                    displayMode === 'ticker'
                      ? [
                          {
                            translateY: slideAnim.interpolate({
                              inputRange: [-1, 0],
                              outputRange: [-cardHeight, 0],
                            }),
                          },
                        ]
                      : [],
                },
              ]}
            >
              <View style={styles.cardContent}>
                <Text
                  style={[styles.eventTitle, { fontSize }]}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                <View style={styles.eventMeta}>
                  {event.date && (
                    <Text style={[styles.eventDate, { fontSize: fontSize * 0.8 }]}>
                      {event.date}
                    </Text>
                  )}
                  {event.time && (
                    <Text
                      style={[
                        styles.eventTime,
                        { fontSize: fontSize * 0.8, color: theme.accent },
                      ]}
                    >
                      {event.time}
                    </Text>
                  )}
                </View>
                {event.location && (
                  <Text
                    style={[styles.eventLocation, { fontSize: fontSize * 0.75 }]}
                    numberOfLines={1}
                  >
                    {event.location}
                  </Text>
                )}
              </View>
            </Animated.View>
          );
        })}
      </View>

      {/* Progress dots for ticker mode */}
      {displayMode === 'ticker' && events.length > 1 && (
        <View style={styles.dots}>
          {events.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex
                      ? theme.accent
                      : 'rgba(255,255,255,0.2)',
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  headerAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  headerText: {
    color: '#fff',
    fontWeight: '700',
    flex: 1,
  },
  headerCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  eventTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  eventDate: {
    color: 'rgba(255,255,255,0.6)',
  },
  eventTime: {
    fontWeight: '600',
  },
  eventLocation: {
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
