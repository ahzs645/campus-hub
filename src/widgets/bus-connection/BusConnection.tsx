'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { renderTransitDisplay, loadPixollettaFont } from './transit/renderer';
import { createLiveTripProvider, type Trip } from './transit/gtfsService';
import BusConnectionOptions from './BusConnectionOptions';

interface BusConnectionConfig {
  glow?: boolean;
  scrollHeadsigns?: boolean;
  displayHeight?: number;
}

const DISPLAY_WIDTH = 128;
const PIXEL_GAP = 0.15;

export default function BusConnection({ config, theme }: WidgetComponentProps) {
  const busConfig = config as BusConnectionConfig | undefined;
  const glow = busConfig?.glow ?? true;
  const scrollHeadsigns = busConfig?.scrollHeadsigns ?? true;
  const displayHeight = busConfig?.displayHeight ?? 32;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontReady, setFontReady] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const startTimeRef = useRef(Date.now());
  const tripsRef = useRef(trips);
  tripsRef.current = trips;

  useEffect(() => {
    loadPixollettaFont().then(() => setFontReady(true));
  }, []);

  useEffect(() => {
    const provider = createLiveTripProvider((updatedTrips) => setTrips(updatedTrips));
    provider.start();
    return () => provider.stop();
  }, []);

  const renderToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !fontReady) return;

    const now = Date.now();
    const uptimeMs = now - startTimeRef.current;
    const currentTrips = tripsRef.current.filter(t => t.arrivalTime > now - 30000);

    const pixels = renderTransitDisplay(
      currentTrips, DISPLAY_WIDTH, displayHeight, now, uptimeMs, null, scrollHeadsigns
    );

    const rect = container.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;

    const scaleX = containerW / DISPLAY_WIDTH;
    const scaleY = containerH / displayHeight;
    const scale = Math.min(scaleX, scaleY);

    const pixelW = scale * (1 - PIXEL_GAP);
    const pixelH = scale * (1 - PIXEL_GAP);
    const gapW = scale * PIXEL_GAP;
    const gapH = scale * PIXEL_GAP;

    const totalW = DISPLAY_WIDTH * scale;
    const totalH = displayHeight * scale;
    const offsetX = (containerW - totalW) / 2;
    const offsetY = (containerH - totalH) / 2;

    canvas.width = containerW * window.devicePixelRatio;
    canvas.height = containerH * window.devicePixelRatio;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${containerH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, containerW, containerH);

    if (glow) {
      ctx.shadowBlur = scale * 0.8;
    }

    for (let y = 0; y < displayHeight; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        const color = pixels[y * DISPLAY_WIDTH + x];
        if (color === '#000000') continue;

        ctx.fillStyle = color;
        if (glow) {
          ctx.shadowColor = color;
        }
        ctx.fillRect(
          offsetX + x * scale + gapW / 2,
          offsetY + y * scale + gapH / 2,
          pixelW,
          pixelH
        );
      }
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }, [fontReady, displayHeight, glow, scrollHeadsigns]);

  useEffect(() => {
    if (!fontReady) return;

    let running = true;
    let animId: number;

    const loop = () => {
      if (!running) return;
      renderToCanvas();
      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [fontReady, renderToCanvas]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        background: '#0a0a0a',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
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
  },
});
