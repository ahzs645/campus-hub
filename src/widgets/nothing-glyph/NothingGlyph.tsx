'use client';

import { useState, useEffect, useRef } from 'react';
import { usePixelDisplay } from 'react-pixel-display';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import GLYPH_CATALOG from './glyphCatalog';
import NothingGlyphOptions from './NothingGlyphOptions';
import lottie, { type AnimationItem } from 'lottie-web';

interface NothingGlyphConfig {
  glyphId?: string;
  customUrl?: string;
  glow?: boolean;
  pixelPitch?: number;
  gridSize?: number;
  speed?: number;
  dotColor?: string;
  bgColor?: string;
}

const COLOR_BG = '#000000';
const CIRCLE_MASK_CACHE = new Map<number, boolean[]>();

function getCircleMask(size: number): boolean[] {
  if (CIRCLE_MASK_CACHE.has(size)) return CIRCLE_MASK_CACHE.get(size)!;
  const mask = new Array(size * size);
  const center = (size - 1) / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      mask[y * size + x] = dx * dx + dy * dy <= radius * radius;
    }
  }
  CIRCLE_MASK_CACHE.set(size, mask);
  return mask;
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function sampleCanvas(
  canvas: HTMLCanvasElement,
  gridSize: number,
  dotColor: string,
  bgColor: string,
  threshold: number = 40,
): string[] {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    return new Array(gridSize * gridSize).fill(bgColor);
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width } = imgData;
  const mask = getCircleMask(gridSize);
  const pixels = new Array(gridSize * gridSize);

  const cellW = width / gridSize;
  const cellH = canvas.height / gridSize;

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const idx = gy * gridSize + gx;
      if (!mask[idx]) {
        pixels[idx] = bgColor;
        continue;
      }

      const sx = Math.floor(gx * cellW + cellW / 2);
      const sy = Math.floor(gy * cellH + cellH / 2);
      const si = (sy * width + sx) * 4;

      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      const a = data[si + 3];

      const brightness = (r + g + b) / 3;
      if (a > 30 && brightness > threshold) {
        if (dotColor === 'auto') {
          pixels[idx] = '#' + toHex(r) + toHex(g) + toHex(b);
        } else {
          pixels[idx] = dotColor;
        }
      } else {
        pixels[idx] = bgColor;
      }
    }
  }

  return pixels;
}

export default function NothingGlyph({ config }: WidgetComponentProps) {
  const cfg = config as NothingGlyphConfig | undefined;
  const glyphId = cfg?.glyphId ?? 'dice';
  const customUrl = cfg?.customUrl?.trim() || '';
  const glow = cfg?.glow ?? true;
  const pixelPitch = cfg?.pixelPitch ?? 10;
  const gridSize = cfg?.gridSize ?? 17;
  const speed = cfg?.speed ?? 1;
  const dotColor = cfg?.dotColor ?? 'auto';
  const bgColor = cfg?.bgColor ?? COLOR_BG;

  const [lottieData, setLottieData] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const lottieContainerRef = useRef<HTMLDivElement>(null);
  const lottieAnimRef = useRef<AnimationItem | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { containerRef, rendererRef } = usePixelDisplay({
    width: gridSize,
    height: gridSize,
    renderer: 'imagedata',
    glow,
    scale: pixelPitch,
    pixelGap: 0.2,
  });

  const jsonUrl = customUrl || GLYPH_CATALOG.find(g => g.id === glyphId)?.jsonUrl || '';

  // Fetch Lottie JSON
  useEffect(() => {
    if (!jsonUrl) return;
    setLoading(true);
    setError(null);
    setLottieData(null);
    setReady(false);

    fetch(jsonUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setLottieData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [jsonUrl]);

  // Initialize lottie renderer
  useEffect(() => {
    if (!lottieData || !lottieContainerRef.current) return;

    if (lottieAnimRef.current) {
      lottieAnimRef.current.destroy();
      lottieAnimRef.current = null;
    }

    const container = lottieContainerRef.current;
    container.innerHTML = '';
    setReady(false);

    const anim = lottie.loadAnimation({
      container,
      renderer: 'canvas',
      loop: true,
      autoplay: true,
      animationData: lottieData,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
        clearCanvas: true,
      },
    });

    anim.setSpeed(speed);
    lottieAnimRef.current = anim;

    // Wait for lottie to be fully loaded before grabbing canvas
    anim.addEventListener('DOMLoaded', () => {
      const canvasEl = container.querySelector('canvas');
      if (canvasEl) {
        offscreenCanvasRef.current = canvasEl;
        setReady(true);
      }
    });

    return () => {
      anim.destroy();
      lottieAnimRef.current = null;
      offscreenCanvasRef.current = null;
    };
  }, [lottieData, speed]);

  // Animation loop: sample lottie canvas -> pixel display
  useEffect(() => {
    if (!ready) return;

    let running = true;
    let animId: number;

    const render = () => {
      if (!running) return;

      const canvas = offscreenCanvasRef.current;
      if (canvas && rendererRef.current) {
        const pixels = sampleCanvas(canvas, gridSize, dotColor, bgColor);
        rendererRef.current.setData(pixels);
        rendererRef.current.renderStatic();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [ready, gridSize, dotColor, bgColor, rendererRef]);

  const activeGlyph = customUrl ? null : GLYPH_CATALOG.find(g => g.id === glyphId);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative"
      style={{ background: '#0a0a0a', borderRadius: '4px', overflow: 'hidden' }}
    >
      {/* Lottie container - visually hidden but stays in layout flow so browser paints it */}
      <div
        ref={lottieContainerRef}
        style={{
          position: 'fixed',
          width: 200,
          height: 200,
          left: 0,
          top: 0,
          pointerEvents: 'none',
          opacity: 0.001,
          zIndex: -1,
        }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-gray-500 animate-pulse">Loading glyph...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-xs text-red-400">Failed to load: {error}</div>
        </div>
      )}

      {/* Round pixel display */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          style={{
            borderRadius: '50%',
            overflow: 'hidden',
            width: gridSize * pixelPitch,
            height: gridSize * pixelPitch,
            boxShadow: glow ? '0 0 30px rgba(255,255,255,0.05)' : undefined,
          }}
        >
          <div
            ref={containerRef}
            style={{
              lineHeight: 0,
              width: gridSize * pixelPitch,
              height: gridSize * pixelPitch,
            }}
          />
        </div>
      </div>

      {/* Glyph name label */}
      {activeGlyph && (
        <div className="text-[10px] text-gray-500 pb-1 text-center truncate max-w-full px-2">
          {activeGlyph.name} — {activeGlyph.creator}
        </div>
      )}
    </div>
  );
}

registerWidget({
  type: 'nothing-glyph',
  name: 'Nothing Glyph',
  description: 'Round dot-matrix display playing Nothing Phone glyph animations',
  icon: 'sparkles',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 3,
  component: NothingGlyph,
  OptionsComponent: NothingGlyphOptions,
  defaultProps: {
    glyphId: 'dice',
    customUrl: '',
    glow: true,
    pixelPitch: 10,
    gridSize: 17,
    speed: 1,
    dotColor: 'auto',
    bgColor: '#000000',
  },
});
