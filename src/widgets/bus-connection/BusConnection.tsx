'use client';

import { useState, useEffect, useRef } from 'react';
import { usePixelDisplay } from 'react-pixel-display';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { renderTransitDisplay, loadPixollettaFont } from './transit/renderer';
import { createLiveTripProvider, type Trip } from './transit/gtfsService';
import BusConnectionOptions from './BusConnectionOptions';

interface BusConnectionConfig {
  glow?: boolean;
  scrollHeadsigns?: boolean;
  displayHeight?: number;
  padding?: number;
  proxyUrl?: string;
}

const DISPLAY_WIDTH = 128;

export default function BusConnection({ config, theme }: WidgetComponentProps) {
  const busConfig = config as BusConnectionConfig | undefined;
  const glow = busConfig?.glow ?? true;
  const scrollHeadsigns = busConfig?.scrollHeadsigns ?? true;
  const displayHeight = busConfig?.displayHeight ?? 32;
  const padding = busConfig?.padding ?? 8;
  const proxyUrl = busConfig?.proxyUrl?.trim() || undefined;

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
      proxyUrl
    );
    provider.start();
    return () => provider.stop();
  }, [proxyUrl]);

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

      const now = Date.now();
      const uptimeMs = now - startTimeRef.current;
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
  },
});
