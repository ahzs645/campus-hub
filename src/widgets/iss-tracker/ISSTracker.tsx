'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useFitScale } from '@/hooks/useFitScale';
import ISSTrackerOptions from './ISSTrackerOptions';

interface ISSTrackerConfig {
  refreshInterval?: number;
  showMap?: boolean;
}

interface ISSPosition {
  latitude: number;
  longitude: number;
  velocity: number;
  timestamp: number;
}

const EARTH_SIZE = 90;
const DESIGN_W = 240;
const DESIGN_H = 200;

// Compute the sun longitude offset based on UTC hour for day/night overlay
function getSunLongitude(): number {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  // At 12:00 UTC the sun is at longitude 0; it moves 15 deg/hour westward
  return -(hours - 12) * 15;
}

export default function ISSTracker({ config }: WidgetComponentProps) {
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

  // Equirectangular projection onto the circular earth image
  const projectX = (lon: number) => ((lon + 180) / 360) * EARTH_SIZE;
  const projectY = (lat: number) => ((90 - lat) / 180) * EARTH_SIZE;

  const formatCoord = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lon).toFixed(1)}° ${lonDir}`;
  };

  // Sun position for radial gradient center (mapped to earth circle)
  const sunLon = getSunLongitude();
  const sunCx = ((sunLon + 180) / 360) * 100; // percentage
  const sunCy = 50; // equator

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: '#1B1B1D', borderRadius: 22 }}
    >
      <style>{`
        @keyframes iss-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col items-center justify-between py-4"
      >
        {loading && !position && (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8E8E93' }}>
              Loading ISS position...
            </span>
          </div>
        )}

        {error && !position && (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#D81921' }}>
              {error}
            </span>
          </div>
        )}

        {position && (
          <>
            {/* Earth globe */}
            {showMap && (
              <div
                style={{
                  width: EARTH_SIZE,
                  height: EARTH_SIZE,
                  borderRadius: EARTH_SIZE / 2,
                  border: '2px solid #5E5E62',
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 0 20px rgba(0, 150, 255, 0.4)',
                  flexShrink: 0,
                }}
              >
                {/* NASA Earth map */}
                <img
                  src="https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png"
                  alt="Earth"
                  style={{
                    width: EARTH_SIZE,
                    height: EARTH_SIZE,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  draggable={false}
                />

                {/* Day/night radial gradient overlay */}
                <svg
                  width={EARTH_SIZE}
                  height={EARTH_SIZE}
                  viewBox={`0 0 ${EARTH_SIZE} ${EARTH_SIZE}`}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                >
                  <defs>
                    <radialGradient
                      id="daynight"
                      cx={`${sunCx}%`}
                      cy={`${sunCy}%`}
                      r="50%"
                    >
                      <stop offset="0%" stopColor="transparent" />
                      <stop offset="50%" stopColor="transparent" />
                      <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
                    </radialGradient>
                  </defs>
                  <rect
                    width={EARTH_SIZE}
                    height={EARTH_SIZE}
                    fill="url(#daynight)"
                  />
                </svg>

                {/* ISS red dot marker */}
                <div
                  style={{
                    position: 'absolute',
                    left: projectX(position.longitude),
                    top: projectY(position.latitude),
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#D81921',
                    border: '1px solid #FFFFFF',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2,
                  }}
                />
                {/* Pulse ring */}
                <div
                  style={{
                    position: 'absolute',
                    left: projectX(position.longitude),
                    top: projectY(position.latitude),
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#D81921',
                    opacity: 0.6,
                    zIndex: 1,
                    animation: 'iss-pulse 2s ease-out infinite',
                  }}
                />
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                marginTop: 'auto',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  color: '#E0E0E0',
                  letterSpacing: 0.2,
                }}
              >
                {formatCoord(position.latitude, position.longitude)}
              </span>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 10,
                  color: '#8E8E93',
                }}
              >
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
