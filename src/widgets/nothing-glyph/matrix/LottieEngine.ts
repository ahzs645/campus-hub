/**
 * Lottie Engine — renders Nothing Playground glyph preview animations
 * onto the diamond matrix by sampling the lottie canvas.
 */

import { MatrixLayout } from './MatrixLayout';
import lottie, { type AnimationItem } from 'lottie-web';

const THRESHOLD = 40;

export interface LottieEngineInstance {
  tick(): number[];
  reset(): void;
  destroy(): void;
  readonly ready: boolean;
}

export function createLottieEngine(jsonUrl: string): LottieEngineInstance {
  let lottieData: object | null = null;
  let anim: AnimationItem | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let container: HTMLDivElement | null = null;
  let isReady = false;
  let fetchFailed = false;

  // Create offscreen container
  container = document.createElement('div');
  container.style.cssText = 'position:fixed;width:200px;height:200px;left:0;top:0;opacity:0.001;pointer-events:none;z-index:-1;';
  document.body.appendChild(container);

  // Fetch the Lottie JSON
  fetch(jsonUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (!container) return;
      lottieData = data;

      anim = lottie.loadAnimation({
        container,
        renderer: 'canvas',
        loop: true,
        autoplay: true,
        animationData: data,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
          clearCanvas: true,
        },
      });

      anim.addEventListener('DOMLoaded', () => {
        canvas = container!.querySelector('canvas');
        if (canvas) isReady = true;
      });
    })
    .catch(() => {
      fetchFailed = true;
    });

  function sampleToMatrix(): number[] {
    const pixels = new Array(MatrixLayout.totalPixels).fill(0);
    if (!canvas || !isReady) return pixels;

    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width === 0) return pixels;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imgData;

    const gridW = MatrixLayout.maxRowWidth;
    const gridH = MatrixLayout.totalRows;
    const cellW = width / gridW;
    const cellH = height / gridH;

    for (let row = 0; row < gridH; row++) {
      const rowWidth = MatrixLayout.rowWidth(row);
      const offset = MatrixLayout.centerOffset(row);

      for (let col = 0; col < rowWidth; col++) {
        const gridCol = col + offset;
        const sx = Math.floor(gridCol * cellW + cellW / 2);
        const sy = Math.floor(row * cellH + cellH / 2);
        const si = (sy * width + sx) * 4;

        const r = data[si];
        const g = data[si + 1];
        const b = data[si + 2];
        const a = data[si + 3];

        const brightness = (r + g + b) / 3;
        if (a > 30 && brightness > THRESHOLD) {
          // Map 0-255 brightness to 0-4095
          const idx = MatrixLayout.pixelIndex(row, col);
          if (idx >= 0) {
            pixels[idx] = Math.round((brightness / 255) * 4095);
          }
        }
      }
    }

    return pixels;
  }

  return {
    get ready() { return isReady; },

    tick(): number[] {
      return sampleToMatrix();
    },

    reset(): void {
      if (anim) {
        anim.goToAndPlay(0);
      }
    },

    destroy(): void {
      if (anim) {
        anim.destroy();
        anim = null;
      }
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
        container = null;
      }
      canvas = null;
      isReady = false;
    },
  };
}
