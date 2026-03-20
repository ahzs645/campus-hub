/**
 * Pendulum Engine — ported from pauwma/GlyphPendulum
 * Auto-animating version for dashboard display
 */

import { MatrixLayout } from './MatrixLayout';

const CONFIG = {
  PIVOT_ROW: 0,
  PIVOT_COL: 6, // center of 13-wide
  PENDULUM_ROWS: 11,
  LENGTH: 11.0,
  GRAVITY: 9.81,
  DAMPING: 0.03,
  MAX_ANGLE: 1.2,
  BOUNCE_DAMPING: 0.5,
  BOB_RADIUS: 1,
  BOB_BRIGHTNESS: 4095,
  ROD_BRIGHTNESS: 2000,
  PIVOT_BRIGHTNESS: 3000,
  TRAIL_LENGTH: 6,
  TRAIL_BRIGHTNESS_START: 1500,
  TRAIL_BRIGHTNESS_STEP: 250,
  // Auto-animation
  AUTO_NUDGE_INTERVAL: 4000,
  AUTO_NUDGE_IMPULSE: 2.5,
};

interface PendulumState {
  theta: number;
  thetaVelocity: number;
  trailPositions: [number, number][];
}

function drawLine(
  pixels: number[],
  x0: number, y0: number,
  x1: number, y1: number,
  brightness: number,
): void {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0, y = y0;

  while (true) {
    MatrixLayout.setPixel(pixels, y, x, brightness);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function drawBob(pixels: number[], centerRow: number, centerCol: number): void {
  const r = CONFIG.BOB_RADIUS;
  for (let dr = -r; dr <= r; dr++) {
    for (let dc = -r; dc <= r; dc++) {
      if (Math.abs(dr) + Math.abs(dc) <= r) {
        MatrixLayout.setPixel(pixels, centerRow + dr, centerCol + dc, CONFIG.BOB_BRIGHTNESS);
      }
    }
  }
}

function render(state: PendulumState): number[] {
  const pixels = new Array(MatrixLayout.totalPixels).fill(0);
  const pendLen = CONFIG.PENDULUM_ROWS;
  const bobRow = Math.floor(pendLen * Math.cos(state.theta));
  const bobCol = Math.floor(CONFIG.PIVOT_COL + pendLen * Math.sin(state.theta));

  // Trail
  for (let i = 0; i < state.trailPositions.length; i++) {
    const brightness = CONFIG.TRAIL_BRIGHTNESS_START - i * CONFIG.TRAIL_BRIGHTNESS_STEP;
    if (brightness > 0) {
      const [tr, tc] = state.trailPositions[i];
      MatrixLayout.setPixel(pixels, Math.floor(tr), Math.floor(tc), brightness);
    }
  }

  // Rod
  drawLine(pixels, CONFIG.PIVOT_COL, CONFIG.PIVOT_ROW, bobCol, bobRow, CONFIG.ROD_BRIGHTNESS);

  // Pivot
  MatrixLayout.setPixel(pixels, CONFIG.PIVOT_ROW, CONFIG.PIVOT_COL, CONFIG.PIVOT_BRIGHTNESS);

  // Bob
  drawBob(pixels, bobRow, bobCol);

  return pixels;
}

export function createPendulumEngine() {
  let state: PendulumState = {
    theta: 0.8, // start offset
    thetaVelocity: 0,
    trailPositions: [],
  };
  let lastTime = Date.now();
  let lastNudge = Date.now();

  return {
    tick(): number[] {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Auto-nudge to keep it swinging
      if (now - lastNudge > CONFIG.AUTO_NUDGE_INTERVAL) {
        if (Math.abs(state.thetaVelocity) < 0.5) {
          const dir = state.theta >= 0 ? -1 : 1;
          state.thetaVelocity += dir * CONFIG.AUTO_NUDGE_IMPULSE;
        }
        lastNudge = now;
      }

      // Physics
      const acc = -(CONFIG.GRAVITY / CONFIG.LENGTH) * Math.sin(state.theta)
        - CONFIG.DAMPING * state.thetaVelocity;

      let newVelocity = state.thetaVelocity + acc * dt;
      let newTheta = state.theta + newVelocity * dt;

      if (newTheta > CONFIG.MAX_ANGLE) {
        newTheta = CONFIG.MAX_ANGLE;
        newVelocity = -Math.abs(newVelocity) * CONFIG.BOUNCE_DAMPING;
      } else if (newTheta < -CONFIG.MAX_ANGLE) {
        newTheta = -CONFIG.MAX_ANGLE;
        newVelocity = Math.abs(newVelocity) * CONFIG.BOUNCE_DAMPING;
      }

      state.theta = newTheta;
      state.thetaVelocity = newVelocity;

      // Trail
      const pendLen = CONFIG.PENDULUM_ROWS;
      const bobRow = pendLen * Math.cos(state.theta);
      const bobCol = CONFIG.PIVOT_COL + pendLen * Math.sin(state.theta);
      state.trailPositions = ([[bobRow, bobCol] as [number, number], ...state.trailPositions]).slice(0, CONFIG.TRAIL_LENGTH);

      return render(state);
    },

    reset(): void {
      state = { theta: 0.8, thetaVelocity: 0, trailPositions: [] };
      lastTime = Date.now();
      lastNudge = Date.now();
    },
  };
}
