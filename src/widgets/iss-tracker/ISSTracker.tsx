'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import ISSTrackerOptions from './ISSTrackerOptions';

interface ISSTrackerConfig {
  refreshInterval?: number; // minutes, default 1
  showMap?: boolean; // default true
}

interface ISSPosition {
  latitude: number;
  longitude: number;
  velocity: number;
  timestamp: number;
}

// Simplified continent outlines as SVG path data (equirectangular projection, viewBox 0 0 360 180)
const CONTINENT_PATHS = [
  // North America
  'M 30 25 L 60 20 L 80 25 L 85 40 L 75 50 L 65 55 L 55 65 L 40 55 L 25 50 L 20 35 Z',
  // South America
  'M 55 70 L 70 65 L 80 75 L 78 95 L 72 115 L 60 130 L 52 120 L 48 100 L 50 80 Z',
  // Europe
  'M 155 20 L 175 18 L 185 25 L 180 35 L 170 40 L 160 38 L 150 30 Z',
  // Africa
  'M 155 45 L 175 42 L 185 55 L 190 75 L 185 95 L 175 110 L 160 105 L 150 90 L 145 70 L 148 55 Z',
  // Asia
  'M 185 15 L 220 10 L 260 15 L 280 25 L 290 40 L 275 50 L 260 55 L 240 50 L 220 45 L 200 40 L 185 35 Z',
  // Australia
  'M 260 90 L 285 85 L 295 95 L 290 110 L 275 115 L 260 108 L 255 98 Z',
  // Indonesia/SE Asia islands
  'M 250 60 L 265 58 L 280 62 L 290 68 L 280 72 L 265 70 L 252 65 Z',
];

const DESIGN_W = 240;
const DESIGN_H = 200;

export default function ISSTracker({ config, theme }: WidgetComponentProps) {
  const cfg = config as ISSTrackerConfig | undefined;
  const refreshInterval = cfg?.refreshInterval ?? 1;
  const showMap = cfg?.showMap ?? true;

  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPosition = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosition({
        latitude: data.latitude,
        longitude: data.longitude,
        velocity: data.velocity,
        timestamp: data.timestamp,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosition();
    const ms = refreshInterval * 60 * 1000;
    const interval = setInterval(fetchPosition, ms);
    return () => clearInterval(interval);
  }, [fetchPosition, refreshInterval]);

  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  // Project lat/lon to SVG coordinates (equirectangular)
  const mapW = 220;
  const mapH = 120;
  const projectX = (lon: number) => ((lon + 180) / 360) * mapW;
  const projectY = (lat: number) => ((90 - lat) / 180) * mapH;

  const formatCoord = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lon).toFixed(1)}° ${lonDir}`;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: '#0a1628' }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col p-3"
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">
            ISS Tracker
          </span>
        </div>

        {loading && !position && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-white/50">Loading ISS position...</span>
          </div>
        )}

        {error && !position && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {position && (
          <>
            {/* Map */}
            {showMap && (
              <svg
                viewBox={`0 0 ${mapW} ${mapH}`}
                className="w-full rounded"
                style={{ height: 120, backgroundColor: '#0a1628' }}
              >
                {/* Grid lines */}
                {/* Longitude lines every 30 degrees */}
                {Array.from({ length: 13 }, (_, i) => i * 30).map((lon) => (
                  <line
                    key={`lon-${lon}`}
                    x1={(lon / 360) * mapW}
                    y1={0}
                    x2={(lon / 360) * mapW}
                    y2={mapH}
                    stroke="#1a3050"
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                ))}
                {/* Latitude lines every 30 degrees */}
                {Array.from({ length: 7 }, (_, i) => i * 30).map((lat) => (
                  <line
                    key={`lat-${lat}`}
                    x1={0}
                    y1={(lat / 180) * mapH}
                    x2={mapW}
                    y2={(lat / 180) * mapH}
                    stroke="#1a3050"
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                ))}

                {/* Continent outlines */}
                {CONTINENT_PATHS.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="#1a3050"
                    stroke="#2a4060"
                    strokeWidth={0.5}
                    transform={`scale(${mapW / 360}, ${mapH / 180})`}
                  />
                ))}

                {/* ISS marker - pulsing red dot */}
                <circle
                  cx={projectX(position.longitude)}
                  cy={projectY(position.latitude)}
                  r={5}
                  fill="rgba(239, 68, 68, 0.3)"
                  className="animate-ping"
                  style={{ transformOrigin: `${projectX(position.longitude)}px ${projectY(position.latitude)}px` }}
                />
                <circle
                  cx={projectX(position.longitude)}
                  cy={projectY(position.latitude)}
                  r={3}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={0.5}
                />
              </svg>
            )}

            {/* Footer */}
            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="text-[10px] text-white/60 font-mono">
                {formatCoord(position.latitude, position.longitude)}
              </span>
              <span className="text-[10px] text-white/40">
                {Math.round(position.velocity).toLocaleString()} km/h
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

registerWidget({
  type: 'iss-tracker',
  name: 'ISS Tracker',
  description: 'Real-time ISS position tracker',
  icon: 'satellite',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: ISSTracker,
  OptionsComponent: ISSTrackerOptions,
  defaultProps: { refreshInterval: 1, showMap: true },
});
