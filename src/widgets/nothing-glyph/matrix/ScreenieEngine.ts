/**
 * Screenie Engine — ported from pauwma/Screenie
 * Auto-cycling face display for dashboard
 *
 * The original used raw pixel indices for the 137-pixel diamond.
 * Our MatrixLayout uses the same row-offset indexing, so we
 * rebuild the faces using (row, col) in maxRowWidth coordinate space.
 */

import { MatrixLayout } from './MatrixLayout';

const CONFIG = {
  FACE_BRIGHTNESS: 4095,
  BORDER_BRIGHTNESS: 2500,
  BORDER_DIM: 800,
  MOOD_CYCLE_MS: 5000,
  CROSSFADE_MS: 800,
  BORDER_ANIM_MS: 3000,
};

/**
 * Convert (row, col) in 13-wide coordinate space to flat pixel index.
 * Returns -1 if outside the diamond.
 */
function px(row: number, col: number): number {
  const offset = MatrixLayout.centerOffset(row);
  const localCol = col - offset;
  return MatrixLayout.pixelIndex(row, localCol);
}

// Face designs in (row, col) coordinates within the 13-wide grid
// Eyes at row 3-4, mouth at rows 7-9
const EYES = [
  px(3, 4), px(3, 8),  // left eye, right eye
];

const FACE_HAPPY = [
  // Eyes
  ...EYES,
  // Nose
  px(5, 6),
  // Smile (curved up)
  px(7, 4), px(7, 8),
  px(8, 5), px(8, 6), px(8, 7),
];

const FACE_SERIOUS = [
  // Eyes
  ...EYES,
  // Nose
  px(5, 6),
  // Straight mouth
  px(8, 4), px(8, 5), px(8, 6), px(8, 7), px(8, 8),
];

const FACE_SAD = [
  // Eyes
  ...EYES,
  // Nose
  px(5, 6),
  // Frown (curved down)
  px(8, 4), px(8, 8),
  px(7, 5), px(7, 6), px(7, 7),
];

const FACES = {
  HAPPY: FACE_HAPPY.filter(i => i >= 0),
  SERIOUS: FACE_SERIOUS.filter(i => i >= 0),
  SAD: FACE_SAD.filter(i => i >= 0),
};

type Mood = 'HAPPY' | 'SERIOUS' | 'SAD';
const MOODS: Mood[] = ['HAPPY', 'SERIOUS', 'SAD'];

// Border pixels — outer ring of the diamond, ordered clockwise from top
function computeBorderPixels(): number[] {
  const border: number[] = [];
  // Top row: all pixels
  for (let c = 0; c < MatrixLayout.rowWidths[0]; c++) {
    border.push(MatrixLayout.pixelIndex(0, c));
  }
  // Right edges going down
  for (let r = 1; r < MatrixLayout.totalRows - 1; r++) {
    border.push(MatrixLayout.pixelIndex(r, MatrixLayout.rowWidths[r] - 1));
  }
  // Bottom row: reversed
  for (let c = MatrixLayout.rowWidths[12] - 1; c >= 0; c--) {
    border.push(MatrixLayout.pixelIndex(12, c));
  }
  // Left edges going up
  for (let r = MatrixLayout.totalRows - 2; r >= 1; r--) {
    border.push(MatrixLayout.pixelIndex(r, 0));
  }
  return border.filter(i => i >= 0);
}

const BORDER_PIXELS = computeBorderPixels();

export function createScreenieEngine() {
  const startTime = Date.now();

  return {
    tick(): number[] {
      const pixels = new Array(MatrixLayout.totalPixels).fill(0);
      const elapsed = Date.now() - startTime;

      // Cycle through moods
      const moodIndex = Math.floor(elapsed / CONFIG.MOOD_CYCLE_MS) % MOODS.length;
      const mood = MOODS[moodIndex];
      const moodElapsed = elapsed % CONFIG.MOOD_CYCLE_MS;

      // Face brightness with crossfade
      let faceBright = CONFIG.FACE_BRIGHTNESS;
      if (moodElapsed < CONFIG.CROSSFADE_MS) {
        faceBright = Math.floor(CONFIG.FACE_BRIGHTNESS * (moodElapsed / CONFIG.CROSSFADE_MS));
      } else if (moodElapsed > CONFIG.MOOD_CYCLE_MS - CONFIG.CROSSFADE_MS) {
        const fadeOut = (CONFIG.MOOD_CYCLE_MS - moodElapsed) / CONFIG.CROSSFADE_MS;
        faceBright = Math.floor(CONFIG.FACE_BRIGHTNESS * fadeOut);
      }

      // Draw face
      const facePixels = FACES[mood];
      for (const idx of facePixels) {
        if (idx >= 0 && idx < pixels.length) {
          pixels[idx] = faceBright;
        }
      }

      // Animated border fill (clockwise)
      const borderProgress = Math.min(1, (elapsed % CONFIG.BORDER_ANIM_MS) / CONFIG.BORDER_ANIM_MS);
      const fillTarget = (moodIndex + 1) / MOODS.length;
      const litCount = Math.floor(BORDER_PIXELS.length * fillTarget * borderProgress);

      for (let i = 0; i < BORDER_PIXELS.length; i++) {
        const idx = BORDER_PIXELS[i];
        if (i < litCount) {
          pixels[idx] = Math.max(pixels[idx], CONFIG.BORDER_BRIGHTNESS);
        } else {
          pixels[idx] = Math.max(pixels[idx], CONFIG.BORDER_DIM);
        }
      }

      return pixels;
    },

    reset(): void {
      // no-op
    },
  };
}
