import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import AppIcon from '../../components/AppIcon';

interface SatelliteViewConfig {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  refreshInterval?: number;
  source?: string;
}

/**
 * Convert lat/lng to tile x/y at a given zoom level (slippy map tilenames).
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

const DEFAULT_TILE_SOURCE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export default function SatelliteView({ config, theme, width, height }: WidgetComponentProps) {
  const cc = config as SatelliteViewConfig | undefined;
  const latitude = cc?.latitude ?? 48.8566;
  const longitude = cc?.longitude ?? 2.3522;
  const zoom = Math.max(1, Math.min(18, cc?.zoom ?? 12));
  const refreshInterval = cc?.refreshInterval ?? 30;
  const source = cc?.source ?? DEFAULT_TILE_SOURCE;

  const [imageError, setImageError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh periodically
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      setImageError(false);
    }, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const tile = useMemo(() => latLngToTile(latitude, longitude, zoom), [latitude, longitude, zoom]);

  const tileUrl = useMemo(() => {
    return source
      .replace('{z}', String(zoom))
      .replace('{x}', String(tile.x))
      .replace('{y}', String(tile.y));
  }, [source, zoom, tile.x, tile.y]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(
    width, height,
    { landscape: { w: 300, h: 300 }, portrait: { w: 260, h: 300 } },
  );

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        {/* Header */}
        <View style={s.header}>
          <AppIcon name="satellite" size={16} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Satellite View</Text>
        </View>
        {/* Satellite image */}
        <View style={s.imageContainer}>
          {!imageError ? (
            <Image
              key={refreshKey}
              source={{ uri: tileUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.errorContainer]}>
              <AppIcon name="satellite" size={32} color="rgba(255,255,255,0.3)" />
              <Text style={s.errorText}>Failed to load imagery</Text>
            </View>
          )}
          {/* Coordinate overlay */}
          <View style={s.coordOverlay}>
            <Text style={s.coordText}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
            <Text style={s.zoomText}>z{zoom}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  headerText: { fontSize: 14, fontWeight: '600' },
  imageContainer: { flex: 1, margin: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
  errorContainer: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  coordOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  coordText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'monospace' },
  zoomText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
});

registerWidget({
  type: 'satellite-view',
  name: 'Satellite View',
  description: 'Shows satellite imagery from a tile server',
  icon: 'satellite',
  minW: 2, minH: 2, defaultW: 3, defaultH: 3,
  component: SatelliteView,
  defaultProps: { latitude: 48.8566, longitude: 2.3522, zoom: 12, refreshInterval: 30 },
});
