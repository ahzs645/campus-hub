'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePixelDisplay } from 'react-pixel-display';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { renderTransitDisplay, loadPixollettaFont } from './transit/renderer';
import { createLiveTripProvider, getScheduledTrips, type Trip } from './transit/gtfsService';
import { SERVICE_DATES } from './transit/gtfsData';
import BusConnectionOptions from './BusConnectionOptions';

interface BusConnectionConfig {
  glow?: boolean;
  scrollHeadsigns?: boolean;
  departureTimeOnly?: boolean;
  pixelPitch?: number;
  padding?: number;
  proxyUrl?: string;
  simulate?: boolean;
  simMode?: 'weekday' | 'saturday';
  simTime?: number;
}

function findWeekdayDate(): string | null {
  return SERVICE_DATES['4795']?.[0] || null;
}

function findSaturdayDate(): string | null {
  return SERVICE_DATES['4800']?.[0] || null;
}

function parseDateStr(str: string | null): { y: number; m: number; d: number } | null {
  if (!str) return null;
  return {
    y: parseInt(str.slice(0, 4)),
    m: parseInt(str.slice(4, 6)) - 1,
    d: parseInt(str.slice(6, 8)),
  };
}

export default function BusConnection({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const busConfig = config as BusConnectionConfig | undefined;
  const glow = busConfig?.glow ?? true;
  const scrollHeadsigns = busConfig?.scrollHeadsigns ?? true;
  const departureTimeOnly = busConfig?.departureTimeOnly ?? false;
  const pixelPitch = busConfig?.pixelPitch ?? 6;
  const padding = busConfig?.padding ?? 8;
  const proxyUrl = busConfig?.proxyUrl?.trim() || undefined;
  const corsProxy = proxyUrl ? undefined : (globalCorsProxy?.trim() || undefined);
  const simulate = busConfig?.simulate ?? false;
  const simMode = busConfig?.simMode ?? 'weekday';
  const simTime = busConfig?.simTime ?? 540;

  const simulatedTime = useMemo(() => {
    if (!simulate) return null;
    const dateStr = simMode === 'saturday' ? findSaturdayDate() : findWeekdayDate();
    const parsed = parseDateStr(dateStr);
    if (!parsed) return null;
    const hours = Math.floor(simTime / 60);
    const mins = simTime % 60;
    return new Date(parsed.y, parsed.m, parsed.d, hours, mins, 0);
  }, [simulate, simMode, simTime]);

  const simTimeRef = useRef(simulatedTime);
  simTimeRef.current = simulatedTime;

  // Compute simulation trips synchronously (no effect delay)
  const simulatedTrips = useMemo(() => {
    if (!simulatedTime) return null;
    return getScheduledTrips(simulatedTime);
  }, [simulatedTime]);

  const [fontReady, setFontReady] = useState(false);
  const [liveTrips, setLiveTrips] = useState<Trip[]>([]);
  const startTimeRef = useRef(Date.now());
  const tripsRef = useRef<Trip[]>([]);
  // Use simulated trips when available, otherwise live trips
  tripsRef.current = simulatedTrips ?? liveTrips;

  // Derive virtual pixel grid from container size and pixel pitch
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      const w = Math.floor(width / pixelPitch);
      const h = Math.floor(height / pixelPitch);
      if (w < 1 || h < 1) return;
      setDisplaySize(prev => (prev && prev.w === w && prev.h === h) ? prev : { w, h });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pixelPitch]);

  const displayW = displaySize?.w ?? 64;
  const displayH = displaySize?.h ?? 16;

  const { containerRef, rendererRef } = usePixelDisplay({
    width: displayW,
    height: displayH,
    renderer: 'imagedata',
    glow,
    scale: pixelPitch,
    pixelGap: 0.15,
  });

  useEffect(() => {
    loadPixollettaFont().then(() => setFontReady(true));
  }, []);

  // Live data provider (only active when not simulating)
  useEffect(() => {
    if (simulate) return;
    const provider = createLiveTripProvider(
      (updatedTrips) => setLiveTrips(updatedTrips),
      proxyUrl,
      corsProxy,
    );
    provider.start();
    return () => provider.stop();
  }, [proxyUrl, corsProxy, simulate]);

  useEffect(() => {
    if (!fontReady || !displaySize) return;

    let running = true;
    let animId: number;

    const render = () => {
      if (!running) return;
      if (!rendererRef.current) {
        animId = requestAnimationFrame(render);
        return;
      }

      const simNow = simTimeRef.current;
      const now = simNow ? simNow.getTime() : Date.now();
      const uptimeMs = Date.now() - startTimeRef.current;
      const currentTrips = tripsRef.current.filter(t => t.arrivalTime > now - 30000);

      const pixels = renderTransitDisplay(
        currentTrips, displayW, displayH, now, uptimeMs, null, scrollHeadsigns, departureTimeOnly
      );

      rendererRef.current.setData(pixels);
      rendererRef.current.renderStatic();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [fontReady, displaySize, displayW, displayH, glow, scrollHeadsigns, departureTimeOnly, rendererRef]);

  return (
    <div
      className="w-full h-full"
      style={{
        background: '#0a0a0a',
        borderRadius: '4px',
        overflow: 'hidden',
        padding: padding > 0 ? `${padding}px` : undefined,
      }}
    >
      <div
        ref={wrapperRef}
        className="w-full h-full"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          ref={containerRef}
          style={{
            lineHeight: 0,
            width: displayW * pixelPitch,
            height: displayH * pixelPitch,
          }}
        />
      </div>
    </div>
  );
}

registerWidget({
  type: 'bus-connection',
  name: 'Bus Connection',
  description: 'Live bus arrival display for UNBC Exchange',
  icon: 'bus',
  minW: 3,
  minH: 2,
  defaultW: 6,
  defaultH: 2,
  component: BusConnection,
  OptionsComponent: BusConnectionOptions,
  defaultProps: {
    glow: true,
    scrollHeadsigns: true,
    departureTimeOnly: false,
    pixelPitch: 6,
    padding: 8,
    proxyUrl: '',
    simulate: false,
    simMode: 'weekday',
    simTime: 540,
  },
});
