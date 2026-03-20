import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';
import Svg, { Rect, Circle, Line, Text as SvgText } from 'react-native-svg';

interface ISSPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface ISSTrackerConfig {
  refreshInterval?: number;
  showDetails?: boolean;
}

const ISS_API = 'http://api.open-notify.org/iss-now.json';

function WorldMap({ width: w, height: h, lat, lng, accentColor }: { width: number; height: number; lat: number; lng: number; accentColor: string }) {
  // Simple rectangular world map with ISS position marker
  const padding = 4;
  const mapW = w - padding * 2;
  const mapH = h - padding * 2;

  // Convert lat/lng to x/y on map
  const x = padding + ((lng + 180) / 360) * mapW;
  const y = padding + ((90 - lat) / 180) * mapH;

  // Simple continent outlines as horizontal bars (very simplified)
  const continents = [
    // North America
    { x: 0.08, y: 0.15, w: 0.22, h: 0.25 },
    // South America
    { x: 0.18, y: 0.45, w: 0.12, h: 0.3 },
    // Europe
    { x: 0.45, y: 0.12, w: 0.1, h: 0.15 },
    // Africa
    { x: 0.45, y: 0.3, w: 0.12, h: 0.35 },
    // Asia
    { x: 0.55, y: 0.1, w: 0.25, h: 0.3 },
    // Australia
    { x: 0.78, y: 0.55, w: 0.1, h: 0.12 },
  ];

  return (
    <Svg width={w} height={h}>
      {/* Ocean background */}
      <Rect x={padding} y={padding} width={mapW} height={mapH} fill="rgba(30,60,100,0.4)" rx={4} />
      {/* Simplified continents */}
      {continents.map((c, i) => (
        <Rect
          key={i}
          x={padding + c.x * mapW}
          y={padding + c.y * mapH}
          width={c.w * mapW}
          height={c.h * mapH}
          fill="rgba(255,255,255,0.12)"
          rx={2}
        />
      ))}
      {/* Equator line */}
      <Line x1={padding} y1={padding + mapH / 2} x2={padding + mapW} y2={padding + mapH / 2} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} strokeDasharray="4,4" />
      {/* Prime meridian */}
      <Line x1={padding + mapW / 2} y1={padding} x2={padding + mapW / 2} y2={padding + mapH} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} strokeDasharray="4,4" />
      {/* ISS position */}
      <Circle cx={x} cy={y} r={6} fill={accentColor} opacity={0.3} />
      <Circle cx={x} cy={y} r={3} fill={accentColor} />
      {/* ISS label */}
      <SvgText x={x + 8} y={y + 4} fill="white" fontSize={9} fontWeight="bold">ISS</SvgText>
    </Svg>
  );
}

export default function ISSTracker({ config, theme, corsProxy, width, height }: WidgetComponentProps) {
  const cc = config as ISSTrackerConfig | undefined;
  const refreshInterval = cc?.refreshInterval ?? 1;
  const showDetails = cc?.showDetails ?? true;
  const refreshMs = refreshInterval * 60 * 1000;

  const [position, setPosition] = useState<ISSPosition>({ latitude: 0, longitude: 0, timestamp: Date.now() });
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    try {
      const fetchUrl = buildProxyUrl(corsProxy, ISS_API);
      const { data } = await fetchJsonWithCache<{
        message: string;
        timestamp: number;
        iss_position: { latitude: string; longitude: string };
      }>(fetchUrl, {
        cacheKey: buildCacheKey('iss', ISS_API),
        ttlMs: Math.min(refreshMs, 30000),
      });
      if (data?.iss_position) {
        setPosition({
          latitude: parseFloat(data.iss_position.latitude),
          longitude: parseFloat(data.iss_position.longitude),
          timestamp: data.timestamp * 1000,
        });
        setError(null);
      }
    } catch {
      setError('Failed to track ISS');
    }
  }, [corsProxy, refreshMs]);

  useEffect(() => {
    fetchPosition();
    const interval = setInterval(fetchPosition, refreshMs);
    return () => clearInterval(interval);
  }, [fetchPosition, refreshMs]);

  const { scale, designWidth, designHeight } = useFitScale(width, height, 300, 200);

  const mapHeight = showDetails ? designHeight - 70 : designHeight - 40;

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        {/* Header */}
        <View style={s.header}>
          <AppIcon name="satellite" size={16} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>ISS Tracker</Text>
        </View>
        {/* Map */}
        <View style={s.mapContainer}>
          <WorldMap
            width={designWidth - 16}
            height={Math.max(40, mapHeight)}
            lat={position.latitude}
            lng={position.longitude}
            accentColor={theme.accent}
          />
        </View>
        {/* Coordinates */}
        {showDetails && (
          <View style={s.details}>
            <View style={s.coordItem}>
              <Text style={s.coordLabel}>LAT</Text>
              <Text style={s.coordValue}>{position.latitude.toFixed(4)}{'\u00B0'}</Text>
            </View>
            <View style={s.coordItem}>
              <Text style={s.coordLabel}>LNG</Text>
              <Text style={s.coordValue}>{position.longitude.toFixed(4)}{'\u00B0'}</Text>
            </View>
          </View>
        )}
        {error && <Text style={s.error}>{error}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
  headerText: { fontSize: 14, fontWeight: '600' },
  mapContainer: { flex: 1, paddingHorizontal: 8 },
  details: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 6 },
  coordItem: { alignItems: 'center' },
  coordLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  coordValue: { color: 'white', fontSize: 14, fontWeight: '700', fontFamily: 'monospace' },
  error: { color: '#ef4444', fontSize: 11, textAlign: 'center', paddingBottom: 4 },
});

registerWidget({
  type: 'iss-tracker',
  name: 'ISS Tracker',
  description: 'Tracks International Space Station position in real-time',
  icon: 'satellite',
  minW: 2, minH: 2, defaultW: 3, defaultH: 2,
  component: ISSTracker,
  defaultProps: { refreshInterval: 1, showDetails: true },
});
