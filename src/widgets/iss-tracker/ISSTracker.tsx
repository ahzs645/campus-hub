'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { useAdaptiveFitScale } from '@/hooks/useFitScale';
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

// Compute the sun longitude offset based on UTC hour for day/night overlay
function getSunLongitude(): number {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
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

  const {
    containerRef, scale, designWidth: BASE_W, designHeight: DESIGN_H,
    isLandscape, containerWidth, containerHeight,
  } = useAdaptiveFitScale({
    landscape: { w: 420, h: 180 },
    portrait: { w: 220, h: 280 },
  });

  const DESIGN_W = containerWidth > 0 ? Math.max(BASE_W, containerWidth / scale) : BASE_W;
  const ACTUAL_H = containerHeight > 0 ? Math.max(DESIGN_H, containerHeight / scale) : DESIGN_H;

  // Globe size adapts to available space
  const earthSize = isLandscape
    ? Math.min(ACTUAL_H * 0.75, DESIGN_W * 0.35, 160)
    : Math.min(ACTUAL_H * 0.5, DESIGN_W * 0.7, 180);

  const projectX = (lon: number) => ((lon + 180) / 360) * earthSize;
  const projectY = (lat: number) => ((90 - lat) / 180) * earthSize;

  const formatCoord = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lon).toFixed(1)}° ${lonDir}`;
  };

  const sunLon = getSunLongitude();
  const sunCx = ((sunLon + 180) / 360) * 100;
  const sunCy = 50;

  const coordFontSize = Math.max(11, earthSize * 0.14);
  const speedFontSize = Math.max(10, earthSize * 0.11);

  const renderGlobe = () => (
    <div
      style={{
        width: earthSize,
        height: earthSize,
        borderRadius: earthSize / 2,
        border: '2px solid #5E5E62',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 0 20px rgba(0, 150, 255, 0.4)',
        flexShrink: 0,
      }}
    >
      <img
        src="https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png"
        alt="Earth"
        style={{ width: earthSize, height: earthSize, objectFit: 'cover', display: 'block' }}
        draggable={false}
      />
      <svg
        width={earthSize}
        height={earthSize}
        viewBox={`0 0 ${earthSize} ${earthSize}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <radialGradient id="daynight" cx={`${sunCx}%`} cy={`${sunCy}%`} r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
          </radialGradient>
        </defs>
        <rect width={earthSize} height={earthSize} fill="url(#daynight)" />
      </svg>
      {position && (
        <>
          <div
            style={{
              position: 'absolute',
              left: projectX(position.longitude),
              top: projectY(position.latitude),
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: '#D81921', border: '1px solid #FFFFFF',
              transform: 'translate(-50%, -50%)', zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: projectX(position.longitude),
              top: projectY(position.latitude),
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: '#D81921', opacity: 0.6, zIndex: 1,
              animation: 'iss-pulse 2s ease-out infinite',
            }}
          />
        </>
      )}
    </div>
  );

  const renderInfo = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: coordFontSize, color: '#E0E0E0', letterSpacing: 0.2 }}>
        {position ? formatCoord(position.latitude, position.longitude) : '...'}
      </span>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: speedFontSize, color: '#8E8E93' }}>
        {position ? `${Math.round(position.velocity).toLocaleString()} km/h` : '...'}
      </span>
    </div>
  );

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
          height: ACTUAL_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className={
          isLandscape
            ? 'flex items-center justify-center gap-6 px-5'
            : 'flex flex-col items-center justify-center gap-3 py-4'
        }
      >
        {loading && !position && (
          <div className="flex items-center justify-center">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#8E8E93' }}>
              Loading ISS position...
            </span>
          </div>
        )}

        {error && !position && (
          <div className="flex items-center justify-center">
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#D81921' }}>
              {error}
            </span>
          </div>
        )}

        {position && (
          isLandscape ? (
            /* Landscape: globe left, info right */
            <>
              {showMap && renderGlobe()}
              <div className="flex flex-col items-center justify-center gap-1">
                {renderInfo()}
              </div>
            </>
          ) : (
            /* Portrait: globe top, info bottom */
            <>
              {showMap && renderGlobe()}
              {renderInfo()}
            </>
          )
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
