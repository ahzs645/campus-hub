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
  displayHeight?: number;
  padding?: number;
  proxyUrl?: string;
  simulate?: boolean;
  simMode?: 'weekday' | 'saturday';
  simTime?: number;
}

const DISPLAY_WIDTH = 128;

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

export default function BusConnection({ config, theme }: WidgetComponentProps) {
  const busConfig = config as BusConnectionConfig | undefined;
  const glow = busConfig?.glow ?? true;
  const scrollHeadsigns = busConfig?.scrollHeadsigns ?? true;
  const displayHeight = busConfig?.displayHeight ?? 32;
  const padding = busConfig?.padding ?? 8;
  const proxyUrl = busConfig?.proxyUrl?.trim() || undefined;
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

  const [fontReady, setFontReady] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const startTimeRef = useRef(Date.now());
  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  const { containerRef, rendererRef } = usePixelDisplay({
    width: DISPLAY_WIDTH,
    height: displayHeight,
    renderer: 'imagedata',
    glow,
    scale: 6,
    pixelGap: 0.15,
  });

  useEffect(() => {
    loadPixollettaFont().then(() => setFontReady(true));
  }, []);

  useEffect(() => {
    const provider = createLiveTripProvider(
      (updatedTrips) => setTrips(updatedTrips),
      proxyUrl,
      () => simTimeRef.current
    );
    provider.start();
    return () => provider.stop();
  }, [proxyUrl, simulate]);

  // Re-fetch when simulated time changes
  useEffect(() => {
    if (simulatedTime) {
      setTrips(getScheduledTrips(simulatedTime));
    }
  }, [simulatedTime]);

  useEffect(() => {
    if (!fontReady) return;

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
        currentTrips, DISPLAY_WIDTH, displayHeight, now, uptimeMs, null, scrollHeadsigns
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
  }, [fontReady, displayHeight, glow, scrollHeadsigns, rendererRef]);

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
        ref={containerRef}
        className="w-full h-full"
        style={{ lineHeight: 0 }}
      />
    </div>
  );
}

registerWidget({
  type: 'bus-connection',
  name: 'Bus Connection',
  description: 'Live bus arrival display for UNBC Exchange',
  icon: '🚌',
  minW: 3,
  minH: 2,
  maxW: 12,
  maxH: 4,
  defaultW: 6,
  defaultH: 2,
  component: BusConnection,
  OptionsComponent: BusConnectionOptions,
  defaultProps: {
    glow: true,
    scrollHeadsigns: true,
    displayHeight: 32,
    padding: 8,
    proxyUrl: '',
    simulate: false,
    simMode: 'weekday',
    simTime: 540,
  },
});
