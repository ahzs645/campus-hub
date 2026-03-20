'use client';

import { useEffect, useRef } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { MatrixLayout } from './matrix/MatrixLayout';
import { createPendulumEngine } from './matrix/PendulumEngine';
import { createStackEngine } from './matrix/StackEngine';
import { createScreenieEngine } from './matrix/ScreenieEngine';
import { createLottieEngine, type LottieEngineInstance } from './matrix/LottieEngine';
import NothingGlyphOptions from './NothingGlyphOptions';
import GLYPH_CATALOG from './glyphCatalog';

interface NothingGlyphConfig {
  mode?: string;
  glow?: boolean;
  pixelSize?: number;
  brightness?: number;
}

interface ModeEntry {
  id: string;
  name: string;
  description: string;
  type: 'native' | 'lottie';
  jsonUrl?: string;
}

// Native engines
const NATIVE_MODES: ModeEntry[] = [
  { id: 'pendulum', name: 'Pendulum', description: 'Physics pendulum with trail', type: 'native' },
  { id: 'stack', name: 'Stack', description: 'Auto-playing stacker arcade', type: 'native' },
  { id: 'screenie', name: 'Screenie', description: 'Mood face with border fill', type: 'native' },
];

// Lottie preview modes from Nothing Playground catalog
const LOTTIE_MODES: ModeEntry[] = GLYPH_CATALOG.map(g => ({
  id: `lottie-${g.id}`,
  name: g.name,
  description: `${g.description} — ${g.creator}`,
  type: 'lottie' as const,
  jsonUrl: g.jsonUrl,
}));

const MODES: ModeEntry[] = [...NATIVE_MODES, ...LOTTIE_MODES];

interface Engine {
  tick(): number[];
  reset(): void;
  destroy?: () => void;
}

function createNativeEngine(mode: string): Engine {
  switch (mode) {
    case 'pendulum': return createPendulumEngine();
    case 'stack': return createStackEngine();
    case 'screenie': return createScreenieEngine();
    default: return createPendulumEngine();
  }
}

/** Map brightness (0-4095) to a CSS color */
function brightnessToColor(b: number, maxBrightness: number): string {
  if (b <= 0) return '#0a0a0a';
  const intensity = Math.min(1, b / maxBrightness);
  const v = Math.round(intensity * 255);
  return `rgb(${v},${v},${v})`;
}

export default function NothingGlyph({ config }: WidgetComponentProps) {
  const cfg = config as NothingGlyphConfig | undefined;
  const mode = cfg?.mode ?? 'pendulum';
  const glow = cfg?.glow ?? true;
  const pixelSize = cfg?.pixelSize ?? 12;
  const brightness = cfg?.brightness ?? 4095;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const modeRef = useRef(mode);

  // Find mode metadata
  const modeMeta = MODES.find(m => m.id === mode) ?? MODES[0];

  // Diamond grid dimensions
  const gridW = MatrixLayout.maxRowWidth;
  const gridH = MatrixLayout.totalRows;
  const canvasW = gridW * pixelSize;
  const canvasH = gridH * pixelSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create or recreate engine on mode change
    if (engineRef.current?.destroy) {
      engineRef.current.destroy();
    }
    engineRef.current = null;

    const entry = MODES.find(m => m.id === mode);
    let engine: Engine;

    if (entry?.type === 'lottie' && entry.jsonUrl) {
      engine = createLottieEngine(entry.jsonUrl);
    } else {
      engine = createNativeEngine(mode);
    }

    engineRef.current = engine;

    let running = true;
    let animId: number;
    const gap = Math.max(1, Math.floor(pixelSize * 0.15));
    const dotSize = pixelSize - gap;

    const render = () => {
      if (!running) return;

      const pixels = engine.tick();
      const grid = MatrixLayout.toGrid(pixels);

      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      for (let row = 0; row < gridH; row++) {
        for (let col = 0; col < gridW; col++) {
          const val = grid[row][col];
          if (val === null) continue;

          const x = col * pixelSize;
          const y = row * pixelSize;

          if (val > 0) {
            ctx.fillStyle = brightnessToColor(val, brightness);

            if (glow && val > 1000) {
              const intensity = Math.min(1, val / brightness);
              ctx.shadowColor = `rgba(255,255,255,${intensity * 0.6})`;
              ctx.shadowBlur = pixelSize * 0.5;
            } else {
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.roundRect(x, y, dotSize, dotSize, dotSize * 0.2);
            ctx.fill();
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#141414';
            ctx.beginPath();
            ctx.roundRect(x, y, dotSize, dotSize, dotSize * 0.2);
            ctx.fill();
          }
        }
      }

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
      if (engine.destroy) engine.destroy();
      engineRef.current = null;
    };
  }, [mode, pixelSize, glow, brightness, canvasW, canvasH, gridW, gridH]);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ background: '#0a0a0a', borderRadius: '4px', overflow: 'hidden' }}
    >
      <div className="flex-1 flex items-center justify-center min-h-0">
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          style={{
            width: canvasW,
            height: canvasH,
            imageRendering: 'pixelated',
          }}
        />
      </div>
      <div className="text-[10px] text-gray-500 pb-1 text-center">
        {modeMeta.name}
      </div>
    </div>
  );
}

export { MODES };

registerWidget({
  type: 'nothing-glyph',
  name: 'Nothing Glyph',
  description: 'Nothing Phone glyph matrix animations — Pendulum, Stack, Screenie & more',
  icon: 'sparkles',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: NothingGlyph,
  OptionsComponent: NothingGlyphOptions,
  defaultProps: {
    mode: 'pendulum',
    glow: true,
    pixelSize: 12,
    brightness: 4095,
  },
});
