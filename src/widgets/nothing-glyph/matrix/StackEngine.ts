/**
 * Stack Game Engine — ported from pauwma/GlyphStack
 * Auto-playing version for dashboard display
 */

import { MatrixLayout } from './MatrixLayout';

const CONFIG = {
  PIECE_ROW: 4,
  PIECE_HEIGHT: 2,
  PIECE_START_WIDTH: 5,
  PIECE_BRIGHTNESS: 4095,
  STACK_BRIGHTNESS: 3000,
  STACK_BRIGHTNESS_ALT: 2000,
  FLASH_BRIGHTNESS: 1500,
  MAX_ROW_WIDTH: 13,
  AUTO_MOVE_SPEED: 8,
  AUTO_MOVE_SPEED_INCREMENT: 0.3,
  DROP_INTERVAL: 40,
  SCROLL_INTERVAL: 60,
  FLASH_DURATION: 300,
  HEART_FRAME_DURATION: 500,
  DISSOLVE_PER_TICK: 3,
  SCORE_DISPLAY_MS: 2000,
  STREAK_THRESHOLD: 3,
  // Auto-play timing
  AUTO_DROP_INTERVAL: 800,
};

// 3x5 pixel font
const DIGITS = [
  [0b111, 0b101, 0b101, 0b101, 0b111], // 0
  [0b010, 0b110, 0b010, 0b010, 0b111], // 1
  [0b111, 0b001, 0b111, 0b100, 0b111], // 2
  [0b111, 0b001, 0b111, 0b001, 0b111], // 3
  [0b101, 0b101, 0b111, 0b001, 0b001], // 4
  [0b111, 0b100, 0b111, 0b001, 0b111], // 5
  [0b111, 0b100, 0b111, 0b101, 0b111], // 6
  [0b111, 0b001, 0b001, 0b001, 0b001], // 7
  [0b111, 0b101, 0b111, 0b101, 0b111], // 8
  [0b111, 0b101, 0b111, 0b001, 0b111], // 9
];

const B = CONFIG.PIECE_BRIGHTNESS;
const HEART_FRAMES = [
  // Frame 0: full heart
  [0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,B,B,B,0,B,B,B,0,0, 0,B,B,B,B,B,B,B,B,B,0, 0,0,B,B,B,B,B,B,B,B,B,0,0, 0,0,B,B,B,B,B,B,B,B,B,0,0, 0,0,B,B,B,B,B,B,B,B,B,0,0, 0,0,0,B,B,B,B,B,B,B,0,0,0, 0,0,0,0,B,B,B,B,B,0,0,0,0, 0,0,0,0,B,B,B,0,0,0,0, 0,0,0,0,0,B,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0],
  // Frame 1: crack
  [0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,B,B,B,0,B,0,B,0,0, 0,B,B,B,B,B,B,0,B,B,0, 0,0,B,B,B,B,B,B,0,B,B,0,0, 0,0,B,B,B,B,B,0,B,B,B,0,0, 0,0,B,B,B,B,B,0,B,B,B,0,0, 0,0,0,B,B,B,0,B,B,B,0,0,0, 0,0,0,0,B,0,B,B,B,0,0,0,0, 0,0,0,0,0,B,B,0,0,0,0, 0,0,0,0,0,B,0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,0,0,0,0],
  // Frame 2: broken
  [0,0,0,0,0, 0,0,0,0,0,0,0,0,0, 0,B,B,B,0,B,0,0,0,0,0, 0,B,B,B,B,B,B,0,0,0,0, 0,0,B,B,B,B,B,B,0,B,0,0,0, 0,0,B,B,B,B,B,0,0,B,B,0,0, 0,0,0,B,B,B,0,0,0,B,B,0,0, 0,0,0,0,B,0,0,0,B,B,B,0,0, 0,0,0,0,0,0,0,B,B,B,0,0,0, 0,0,0,0,0,B,B,B,0,0,0, 0,0,0,0,0,B,B,0,0,0,0, 0,0,0,0,B,0,0,0,0, 0,0,0,0,0],
];

type Phase = 'playing' | 'dropping' | 'scrolling' | 'flash' | 'gameOver' | 'heartAnim' | 'dissolving' | 'score' | 'restart';

interface StackLayer {
  position: number;
  width: number;
}

interface StackState {
  phase: Phase;
  piecePosition: number;
  pieceWidth: number;
  autoMoveDir: number;
  stackLayers: StackLayer[];
  stackTopRow: number;
  stackScrollOffset: number;
  dropRow: number;
  score: number;
  streak: number;
  heartFrame: number;
  dissolveStep: number;
  phaseTimer: number;
}

function drawBlock(pixels: number[], row: number, position: number, width: number, brightness: number): void {
  if (row < 0 || row >= MatrixLayout.totalRows) return;
  const offset = MatrixLayout.centerOffset(row);
  const rw = MatrixLayout.rowWidth(row);
  for (let i = 0; i < width; i++) {
    const col = position + i - offset;
    if (col >= 0 && col < rw) {
      const idx = MatrixLayout.pixelIndex(row, col);
      if (idx >= 0) pixels[idx] = brightness;
    }
  }
}

function renderScore(pixels: number[], score: number): void {
  const text = String(score);
  const totalWidth = text.length * 3 + (text.length - 1);
  const startCol = Math.floor((CONFIG.MAX_ROW_WIDTH - totalWidth) / 2);
  const startRow = Math.floor((MatrixLayout.totalRows - 5) / 2);

  for (let di = 0; di < text.length; di++) {
    const digit = parseInt(text[di]);
    if (digit < 0 || digit > 9) continue;
    const bitmap = DIGITS[digit];
    const colOffset = startCol + di * 4;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (bitmap[r] & (1 << (2 - c))) {
          MatrixLayout.setPixel(pixels, startRow + r, colOffset + c, CONFIG.PIECE_BRIGHTNESS);
        }
      }
    }
  }
}

function snakeOrder(state: StackState): number[] {
  const result: number[] = [];
  let rowIndex = 0;
  for (let i = 0; i < state.stackLayers.length; i++) {
    const layer = state.stackLayers[i];
    for (let r = 0; r < CONFIG.PIECE_HEIGHT; r++) {
      const row = state.stackTopRow + i * CONFIG.PIECE_HEIGHT + r;
      if (row < 0 || row >= MatrixLayout.totalRows) { rowIndex++; continue; }
      const offset = MatrixLayout.centerOffset(row);
      const rw = MatrixLayout.rowWidth(row);
      const cols: number[] = [];
      for (let c = layer.position; c < layer.position + layer.width; c++) {
        const col = c - offset;
        if (col >= 0 && col < rw) {
          const idx = MatrixLayout.pixelIndex(row, col);
          if (idx >= 0) cols.push(idx);
        }
      }
      if (rowIndex % 2 !== 0) cols.reverse();
      result.push(...cols);
      rowIndex++;
    }
  }
  return result;
}

function renderGame(state: StackState): number[] {
  const pixels = new Array(MatrixLayout.totalPixels).fill(0);

  if (state.phase === 'flash') {
    pixels.fill(CONFIG.FLASH_BRIGHTNESS);
    for (let i = 0; i < state.stackLayers.length; i++) {
      const layer = state.stackLayers[i];
      for (let r = 0; r < CONFIG.PIECE_HEIGHT; r++) {
        const row = state.stackTopRow + i * CONFIG.PIECE_HEIGHT + r;
        drawBlock(pixels, row, layer.position, layer.width, 0);
      }
    }
    return pixels;
  }

  if (state.phase === 'heartAnim') {
    const frame = HEART_FRAMES[Math.min(state.heartFrame, 2)];
    for (let i = 0; i < Math.min(frame.length, pixels.length); i++) {
      pixels[i] = frame[i];
    }
    return pixels;
  }

  if (state.phase === 'dissolving') {
    // Draw stack then erase snake
    for (let i = 0; i < state.stackLayers.length; i++) {
      const layer = state.stackLayers[i];
      const brightness = i % 2 === 0 ? CONFIG.STACK_BRIGHTNESS : CONFIG.STACK_BRIGHTNESS_ALT;
      for (let r = 0; r < CONFIG.PIECE_HEIGHT; r++) {
        const row = state.stackTopRow + i * CONFIG.PIECE_HEIGHT + r;
        drawBlock(pixels, row, layer.position, layer.width, brightness);
      }
    }
    const snake = snakeOrder(state);
    const eaten = Math.min(state.dissolveStep, snake.length);
    for (let j = 0; j < eaten; j++) {
      pixels[snake[j]] = 0;
    }
    return pixels;
  }

  if (state.phase === 'score') {
    renderScore(pixels, state.score);
    return pixels;
  }

  // Playing / dropping
  const pieceTopRow = state.phase === 'dropping' ? state.dropRow : CONFIG.PIECE_ROW;
  const piecePos = Math.floor(state.piecePosition);
  for (let r = 0; r < CONFIG.PIECE_HEIGHT; r++) {
    drawBlock(pixels, pieceTopRow + r, piecePos, state.pieceWidth, CONFIG.PIECE_BRIGHTNESS);
  }

  // Stack
  for (let i = 0; i < state.stackLayers.length; i++) {
    const layer = state.stackLayers[i];
    const brightness = i % 2 === 0 ? CONFIG.STACK_BRIGHTNESS : CONFIG.STACK_BRIGHTNESS_ALT;
    for (let r = 0; r < CONFIG.PIECE_HEIGHT; r++) {
      const row = state.stackTopRow + i * CONFIG.PIECE_HEIGHT + r + state.stackScrollOffset;
      drawBlock(pixels, row, layer.position, layer.width, brightness);
    }
  }

  return pixels;
}

export function createStackEngine() {
  let state: StackState = {
    phase: 'playing',
    piecePosition: 0,
    pieceWidth: CONFIG.PIECE_START_WIDTH,
    autoMoveDir: 1,
    stackLayers: [{ position: 0, width: CONFIG.MAX_ROW_WIDTH }],
    stackTopRow: MatrixLayout.totalRows - 2,
    stackScrollOffset: 0,
    dropRow: CONFIG.PIECE_ROW,
    score: 0,
    streak: 0,
    heartFrame: 0,
    dissolveStep: 0,
    phaseTimer: 0,
  };

  let lastTime = Date.now();
  let lastAutoDrop = Date.now();
  let phaseStart = Date.now();

  function resetGame() {
    state = {
      phase: 'playing',
      piecePosition: 0,
      pieceWidth: CONFIG.PIECE_START_WIDTH,
      autoMoveDir: 1,
      stackLayers: [{ position: 0, width: CONFIG.MAX_ROW_WIDTH }],
      stackTopRow: MatrixLayout.totalRows - 2,
      stackScrollOffset: 0,
      dropRow: CONFIG.PIECE_ROW,
      score: 0,
      streak: 0,
      heartFrame: 0,
      dissolveStep: 0,
      phaseTimer: 0,
    };
    lastAutoDrop = Date.now();
    phaseStart = Date.now();
  }

  function resolveLanding() {
    const piecePos = Math.floor(state.piecePosition);
    const topLayer = state.stackLayers[0];
    const overlapStart = Math.max(piecePos, topLayer.position);
    const overlapEnd = Math.min(piecePos + state.pieceWidth, topLayer.position + topLayer.width);
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth <= 0) {
      state.phase = 'heartAnim';
      state.heartFrame = 0;
      phaseStart = Date.now();
      return;
    }

    const isPerfect = overlapWidth === state.pieceWidth && state.pieceWidth === topLayer.width && piecePos === topLayer.position;
    let newStreak = isPerfect ? state.streak + 1 : 0;
    let newWidth = overlapWidth;
    if (newStreak >= CONFIG.STREAK_THRESHOLD) {
      newWidth = Math.min(overlapWidth + 1, CONFIG.PIECE_START_WIDTH);
      newStreak = 0;
    }

    const layerPos = overlapStart - Math.floor((newWidth - overlapWidth) / 2);
    state.stackLayers = [{ position: layerPos, width: newWidth }, ...state.stackLayers];
    state.stackTopRow = state.dropRow;
    state.pieceWidth = newWidth;
    state.score++;
    state.streak = newStreak;
    state.phase = isPerfect ? 'flash' : 'scrolling';
    state.stackScrollOffset = 0;
    phaseStart = Date.now();
  }

  return {
    tick(): number[] {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;
      const elapsed = now - phaseStart;

      switch (state.phase) {
        case 'playing': {
          const speed = CONFIG.AUTO_MOVE_SPEED + CONFIG.AUTO_MOVE_SPEED_INCREMENT * state.score;
          const drift = state.autoMoveDir * speed * (dt / 1000);
          let newPos = state.piecePosition + drift;
          const minPos = -(state.pieceWidth - 1);
          const maxPos = CONFIG.MAX_ROW_WIDTH - 1;

          if (newPos <= minPos) { newPos = minPos; state.autoMoveDir = 1; }
          else if (newPos >= maxPos) { newPos = maxPos; state.autoMoveDir = -1; }
          state.piecePosition = newPos;

          // Auto-drop
          if (now - lastAutoDrop > CONFIG.AUTO_DROP_INTERVAL) {
            // Smart drop: aim near the top layer
            const topLayer = state.stackLayers[0];
            const pieceCenter = state.piecePosition + state.pieceWidth / 2;
            const targetCenter = topLayer.position + topLayer.width / 2;
            if (Math.abs(pieceCenter - targetCenter) < topLayer.width * 0.6) {
              state.phase = 'dropping';
              state.dropRow = CONFIG.PIECE_ROW;
              phaseStart = now;
            }
            lastAutoDrop = now;
          }
          break;
        }

        case 'dropping': {
          if (elapsed > CONFIG.DROP_INTERVAL * (state.dropRow - CONFIG.PIECE_ROW + 1)) {
            const targetRow = state.stackTopRow;
            if (state.dropRow + CONFIG.PIECE_HEIGHT >= targetRow) {
              resolveLanding();
            } else {
              state.dropRow++;
            }
          }
          break;
        }

        case 'scrolling': {
          const needsScroll = state.stackTopRow < CONFIG.PIECE_ROW + 2 * CONFIG.PIECE_HEIGHT;
          if (!needsScroll || elapsed > CONFIG.SCROLL_INTERVAL * CONFIG.PIECE_HEIGHT) {
            if (needsScroll) {
              state.stackTopRow += CONFIG.PIECE_HEIGHT;
            }
            state.stackScrollOffset = 0;
            // Spawn next piece
            state.piecePosition = state.autoMoveDir === 1 ? -(state.pieceWidth - 1) : CONFIG.MAX_ROW_WIDTH - 1;
            state.phase = 'playing';
            state.dropRow = CONFIG.PIECE_ROW;
            lastAutoDrop = now;
            phaseStart = now;
          } else {
            state.stackScrollOffset = Math.floor(elapsed / CONFIG.SCROLL_INTERVAL);
          }
          break;
        }

        case 'flash': {
          if (elapsed > CONFIG.FLASH_DURATION) {
            state.phase = 'scrolling';
            state.stackScrollOffset = 0;
            phaseStart = now;
          }
          break;
        }

        case 'heartAnim': {
          state.heartFrame = Math.min(2, Math.floor(elapsed / CONFIG.HEART_FRAME_DURATION));
          if (elapsed > CONFIG.HEART_FRAME_DURATION * 3) {
            if (state.stackLayers.length > 1) {
              state.phase = 'dissolving';
              state.dissolveStep = 0;
              phaseStart = now;
            } else {
              state.phase = 'score';
              phaseStart = now;
            }
          }
          break;
        }

        case 'dissolving': {
          state.dissolveStep = Math.floor(elapsed / 30) * CONFIG.DISSOLVE_PER_TICK;
          const totalPx = snakeOrder(state).length;
          if (state.dissolveStep >= totalPx) {
            state.phase = 'score';
            phaseStart = now;
          }
          break;
        }

        case 'score': {
          if (elapsed > CONFIG.SCORE_DISPLAY_MS) {
            resetGame();
          }
          break;
        }
      }

      return renderGame(state);
    },

    reset(): void {
      resetGame();
    },
  };
}
