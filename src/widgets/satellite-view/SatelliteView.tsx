'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
import SatelliteViewOptions from './SatelliteViewOptions';

interface SatelliteViewConfig {
  lat?: number;
  lon?: number;
  zoom?: number;
  year?: string;
  showLabel?: boolean;
  locationLabel?: string;
}

// --- Slippy-map math (Web Mercator / EPSG:3857) ---

/** Convert lat/lon + zoom to fractional tile coordinates. */
const latLonToTile = (
  lat: number,
  lon: number,
  zoom: number
): { x: number; y: number } => {
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
};

const SUBDOMAINS = ['a', 'b', 'c', 'd'];

const tileUrl = (tx: number, ty: number, zoom: number, year: string): string => {
  const sub = SUBDOMAINS[(tx + ty) % SUBDOMAINS.length];
  const layer = year === '2016' ? 's2cloudless' : `s2cloudless-${year}`;
  return `https://${sub}.tiles.maps.eox.at/wmts/1.0.0/${layer}_3857/default/GoogleMapsCompatible/${zoom}/${ty}/${tx}.jpg`;
};

/** Well-known locations for presets. */
const LOCATION_PRESETS: Record<string, { lat: number; lon: number; label: string }> = {
  'prince-george': { lat: 53.9171, lon: -122.7497, label: 'Prince George, BC' },
  'vancouver': { lat: 49.2827, lon: -123.1207, label: 'Vancouver, BC' },
  'victoria': { lat: 48.4284, lon: -123.3656, label: 'Victoria, BC' },
  'kamloops': { lat: 50.6745, lon: -120.3273, label: 'Kamloops, BC' },
  'kelowna': { lat: 49.8880, lon: -119.4960, label: 'Kelowna, BC' },
  'williams-lake': { lat: 52.1417, lon: -122.1417, label: 'Williams Lake, BC' },
};

export default function SatelliteView({ config, theme }: WidgetComponentProps) {
  const cfg = config as SatelliteViewConfig | undefined;
  const lat = cfg?.lat ?? 53.9171; // Prince George default
  const lon = cfg?.lon ?? -122.7497;
  const zoom = Math.min(13, Math.max(1, cfg?.zoom ?? 10));
  const year = cfg?.year ?? '2024';
  const showLabel = cfg?.showLabel ?? true;
  const locationLabel = cfg?.locationLabel?.trim() || '';

  // Adapt to container aspect ratio for better coverage
  const { containerRef, scale, designWidth: DESIGN_W, designHeight: DESIGN_H } = useAdaptiveFitScale({
    landscape: { w: 400, h: 300 },
    portrait: { w: 300, h: 400 },
  });

  const TILE_SIZE = 256;

  // Calculate which tiles we need to fill the design area
  const tileGrid = useMemo(() => {
    const center = latLonToTile(lat, lon, zoom);
    const centerTileX = Math.floor(center.x);
    const centerTileY = Math.floor(center.y);

    // Pixel offset of center within its tile
    const offsetX = (center.x - centerTileX) * TILE_SIZE;
    const offsetY = (center.y - centerTileY) * TILE_SIZE;

    // How many tiles we need on each side to fill the design area
    const tilesX = Math.ceil(DESIGN_W / TILE_SIZE) + 1;
    const tilesY = Math.ceil(DESIGN_H / TILE_SIZE) + 1;
    const halfX = Math.floor(tilesX / 2);
    const halfY = Math.floor(tilesY / 2);

    const tiles: { tx: number; ty: number; px: number; py: number }[] = [];
    const maxTile = Math.pow(2, zoom);

    for (let dy = -halfY; dy <= halfY; dy++) {
      for (let dx = -halfX; dx <= halfX; dx++) {
        const tx = ((centerTileX + dx) % maxTile + maxTile) % maxTile;
        const ty = centerTileY + dy;
        if (ty < 0 || ty >= maxTile) continue;

        // Position relative to the design area's top-left
        const px = DESIGN_W / 2 - offsetX + dx * TILE_SIZE;
        const py = DESIGN_H / 2 - offsetY + dy * TILE_SIZE;

        tiles.push({ tx, ty, px, py });
      }
    }
    return tiles;
  }, [lat, lon, zoom, DESIGN_W, DESIGN_H]);

  // Determine display label
  const displayLabel = useMemo(() => {
    if (locationLabel) return locationLabel;
    // Check if it matches a preset
    for (const preset of Object.values(LOCATION_PRESETS)) {
      if (
        Math.abs(preset.lat - lat) < 0.01 &&
        Math.abs(preset.lon - lon) < 0.01
      ) {
        return preset.label;
      }
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }, [lat, lon, locationLabel]);

  const [loadErrors, setLoadErrors] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((key: string) => {
    setLoadErrors((prev) => new Set(prev).add(key));
  }, []);

  // Reset errors when config changes
  useEffect(() => {
    setLoadErrors(new Set());
  }, [lat, lon, zoom, year]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}30` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Tile grid */}
        {tileGrid.map(({ tx, ty, px, py }) => {
          const key = `${zoom}-${tx}-${ty}`;
          const isError = loadErrors.has(key);
          return (
            <img
              key={key}
              src={isError ? undefined : tileUrl(tx, ty, zoom, year)}
              alt=""
              width={TILE_SIZE}
              height={TILE_SIZE}
              loading="eager"
              draggable={false}
              onError={() => handleImageError(key)}
              style={{
                position: 'absolute',
                left: px,
                top: py,
                width: TILE_SIZE,
                height: TILE_SIZE,
                display: 'block',
                imageRendering: 'auto',
              }}
            />
          );
        })}

        {/* Center crosshair */}
        <div
          style={{
            position: 'absolute',
            left: DESIGN_W / 2 - 8,
            top: DESIGN_H / 2 - 8,
            width: 16,
            height: 16,
            pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 16 16" width={16} height={16}>
            <circle
              cx={8}
              cy={8}
              r={6}
              fill="none"
              stroke="white"
              strokeWidth={1.5}
              opacity={0.7}
            />
            <circle cx={8} cy={8} r={1.5} fill="white" opacity={0.8} />
          </svg>
        </div>

        {/* Label overlay */}
        {showLabel && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              padding: '24px 12px 8px',
            }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="text-sm font-semibold text-white">
                  {displayLabel}
                </div>
                <div className="text-[10px] text-white/50">
                  Sentinel-2 {year} &bull; Zoom {zoom}
                </div>
              </div>
              <div
                className="text-[8px] text-white/30 leading-tight text-right"
                style={{ maxWidth: 150 }}
              >
                Sentinel-2 cloudless by EOX
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'satellite-view',
  name: 'Satellite View',
  description: 'Sentinel-2 satellite imagery of any location',
  icon: 'globe',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: SatelliteView,
  OptionsComponent: SatelliteViewOptions,
  defaultProps: {
    lat: 53.9171,
    lon: -122.7497,
    zoom: 10,
    year: '2024',
    showLabel: true,
    locationLabel: '',
  },
});
