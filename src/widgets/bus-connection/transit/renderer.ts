/**
 * Transit Tracker Display Renderer
 *
 * Faithfully replicates the rendering from:
 * https://github.com/EastsideUrbanism/transit-tracker
 *
 * Uses the actual Pixolletta8px font via canvas to match
 * the ESP32 HUB75 LED matrix output pixel-for-pixel.
 */

import type { Trip } from './gtfsService';

// ── Colors (exact values from transit_tracker.cpp) ──────────────────
const COLOR_WHITE = '#FFFFFF';
const COLOR_TIME_REALTIME = '#20FF00';
const COLOR_TIME_SCHEDULED = '#A7A7A7';
const COLOR_DEFAULT_ROUTE = '#028E51';
const COLOR_RT_ICON_LIT = '#20FF00';
const COLOR_RT_ICON_DIM = '#00A700';
const COLOR_STATUS = '#555555';
const COLOR_BG = '#000000';

// ── Font metrics (Pixolletta8px at size 10) ─────────────────────────
const FONT_SIZE = 10;
const FONT_ASCENDER = 8;
const FONT_DESCENDER = 2;
const NOMINAL_HEIGHT = FONT_ASCENDER + FONT_DESCENDER;

// ── Realtime icon (6x6 pixel pattern) ───────────────────────────────
const RT_ICON = [
  [0, 0, 0, 3, 3, 3],
  [0, 0, 3, 0, 0, 0],
  [0, 3, 0, 0, 2, 2],
  [3, 0, 0, 2, 0, 0],
  [3, 0, 2, 0, 0, 1],
  [3, 0, 2, 0, 1, 1],
];

const RT_ANIM_CYCLE = 4000;
const RT_ANIM_IDLE = 3000;
const RT_ANIM_FRAME_MS = 200;

function getRealtimeIconFrame(uptimeMs: number): number {
  const cyclePos = uptimeMs % RT_ANIM_CYCLE;
  if (cyclePos < RT_ANIM_IDLE) return 0;
  const frameIdx = Math.floor((cyclePos - RT_ANIM_IDLE) / RT_ANIM_FRAME_MS) + 1;
  return Math.min(frameIdx, 5);
}

function isSegmentLit(segment: number, frame: number): boolean {
  switch (frame) {
    case 1: return segment === 1;
    case 2: return segment === 1 || segment === 2;
    case 3: return segment === 1 || segment === 2 || segment === 3;
    case 4: return segment === 2 || segment === 3;
    case 5: return segment === 3;
    default: return false;
  }
}

// ── Scrolling constants ─────────────────────────────────────────────
const SCROLL_SPEED = 10;
const IDLE_TIME_LEFT = 5000;
const IDLE_TIME_RIGHT = 1000;

function getScrollOffset(overflow: number, uptimeMs: number, cycleDuration: number): number {
  if (overflow <= 0 || cycleDuration <= 0) return 0;
  const scrollTime = (overflow * 1000) / SCROLL_SPEED;
  const cyclePos = uptimeMs % cycleDuration;

  if (cyclePos < IDLE_TIME_LEFT) return 0;
  const t1 = IDLE_TIME_LEFT + scrollTime;
  if (cyclePos < t1) {
    return Math.floor(((cyclePos - IDLE_TIME_LEFT) / scrollTime) * overflow);
  }
  const t2 = t1 + IDLE_TIME_RIGHT;
  if (cyclePos < t2) return overflow;
  const t3 = t2 + scrollTime;
  if (cyclePos < t3) {
    return Math.floor((1 - (cyclePos - t2) / scrollTime) * overflow);
  }
  return 0;
}

// ── Canvas font renderer ────────────────────────────────────────────

let _fontLoaded = false;
let _fontCanvas: HTMLCanvasElement | null = null;
let _fontCtx: CanvasRenderingContext2D | null = null;

export async function loadPixollettaFont(): Promise<void> {
  if (_fontLoaded) return;
  try {
    const font = new FontFace('Pixolletta8px', 'url(/fonts/Pixolletta8px.ttf)');
    await font.load();
    document.fonts.add(font);
  } catch (e) {
    console.warn('Could not load Pixolletta8px, using fallback:', e);
  }
  _fontCanvas = document.createElement('canvas');
  _fontCtx = _fontCanvas.getContext('2d', { willReadFrequently: true });
  _fontLoaded = true;
}

function setupCtx(ctx: CanvasRenderingContext2D): void {
  ctx.font = `${FONT_SIZE}px Pixolletta8px, monospace`;
  ctx.textBaseline = 'top';
  ctx.imageSmoothingEnabled = false;
}

export function measureText(text: string): number {
  if (!_fontCtx) return text.length * 6;
  setupCtx(_fontCtx);
  return Math.ceil(_fontCtx.measureText(text).width);
}

function renderText(
  pixels: string[], dw: number, dh: number,
  text: string, x: number, y: number, color: string
): void {
  if (!_fontCtx || !_fontCanvas || !text) return;
  const tw = measureText(text) + 2;
  const th = NOMINAL_HEIGHT + 2;
  _fontCanvas.width = tw;
  _fontCanvas.height = th;
  setupCtx(_fontCtx);
  _fontCtx.clearRect(0, 0, tw, th);
  _fontCtx.fillStyle = 'white';
  _fontCtx.fillText(text, 0, 0);

  const img = _fontCtx.getImageData(0, 0, tw, th);
  const data = img.data;
  for (let py = 0; py < th; py++) {
    for (let px = 0; px < tw; px++) {
      const alpha = data[(py * tw + px) * 4 + 3];
      if (alpha > 80) {
        const destX = x + px;
        const destY = y + py;
        if (destX >= 0 && destX < dw && destY >= 0 && destY < dh) {
          pixels[destY * dw + destX] = color;
        }
      }
    }
  }
}

function renderTextRight(
  pixels: string[], dw: number, dh: number,
  text: string, rightX: number, y: number, color: string
): void {
  const tw = measureText(text);
  renderText(pixels, dw, dh, text, rightX - tw, y, color);
}

function renderTextClipped(
  pixels: string[], dw: number, dh: number,
  text: string, textX: number, y: number, color: string,
  clipLeft: number, clipRight: number
): void {
  if (!_fontCtx || !_fontCanvas || !text) return;
  const tw = measureText(text) + 2;
  const th = NOMINAL_HEIGHT + 2;
  _fontCanvas.width = tw;
  _fontCanvas.height = th;
  setupCtx(_fontCtx);
  _fontCtx.clearRect(0, 0, tw, th);
  _fontCtx.fillStyle = 'white';
  _fontCtx.fillText(text, 0, 0);

  const img = _fontCtx.getImageData(0, 0, tw, th);
  const data = img.data;
  for (let py = 0; py < th; py++) {
    for (let px = 0; px < tw; px++) {
      const alpha = data[(py * tw + px) * 4 + 3];
      if (alpha > 80) {
        const destX = textX + px;
        const destY = y + py;
        if (destX >= clipLeft && destX < clipRight && destY >= 0 && destY < dh) {
          pixels[destY * dw + destX] = color;
        }
      }
    }
  }
}

function drawRealtimeIcon(
  pixels: string[], dw: number, dh: number,
  bottomRightX: number, bottomRightY: number, uptimeMs: number
): void {
  const frame = getRealtimeIconFrame(uptimeMs);
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const seg = RT_ICON[row][col];
      if (seg === 0) continue;
      const lit = isSegmentLit(seg, frame);
      const color = lit ? COLOR_RT_ICON_LIT : COLOR_RT_ICON_DIM;
      const px = bottomRightX - (5 - col);
      const py = bottomRightY - (5 - row);
      if (px >= 0 && px < dw && py >= 0 && py < dh) {
        pixels[py * dw + px] = color;
      }
    }
  }
}

// ── Time formatting ─────────────────────────────────────────────────

export function formatTime(arrivalTime: number, now: number): string {
  const diffSec = Math.floor((arrivalTime - now) / 1000);
  if (diffSec < 30) return 'Now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}h${mins.toString().padStart(2, '0')}m`;
}

// ── Main display renderer ───────────────────────────────────────────

export function renderTransitDisplay(
  trips: Trip[],
  width: number,
  height: number,
  now: number,
  uptimeMs: number = 0,
  limit: number | null = null,
  scrollHeadsigns: boolean = true,
  departureTimeOnly: boolean = false
): string[] {
  const pixels = new Array(width * height).fill(COLOR_BG);

  if (!_fontLoaded) return pixels;

  if (limit === null) {
    limit = Math.floor(height / NOMINAL_HEIGHT);
  }
  const displayTrips = trips.slice(0, limit);

  if (displayTrips.length === 0) {
    const msg = departureTimeOnly ? 'No upcoming departures' : 'No upcoming arrivals';
    const tw = measureText(msg);
    const x = Math.floor((width - tw) / 2);
    const y = Math.floor((height - NOMINAL_HEIGHT) / 2);
    renderText(pixels, width, height, msg, x, y, COLOR_STATUS);
    return pixels;
  }

  const maxTripsHeight = (limit * FONT_ASCENDER) + ((limit - 1) * FONT_DESCENDER);
  const yOffset0 = Math.floor((height % maxTripsHeight) / 2);

  let longestOverflow = 0;

  let maxRouteWidth = 0;
  if (!departureTimeOnly) {
    for (const trip of displayTrips) {
      const rw = measureText(trip.routeName || '');
      if (rw > maxRouteWidth) maxRouteWidth = rw;
    }
  }

  const tripLayouts = displayTrips.map((trip, i) => {
    const yOff = yOffset0 + i * NOMINAL_HEIGHT;

    const routeName = trip.routeName || '';
    const routeColor = trip.routeColor
      ? (trip.routeColor.startsWith('#') ? trip.routeColor : `#${trip.routeColor}`)
      : COLOR_DEFAULT_ROUTE;

    const prevTrip = i > 0 ? displayTrips[i - 1] : null;
    const showRouteName = !departureTimeOnly && (!prevTrip || prevTrip.routeId !== trip.routeId);

    const timeStr = formatTime(trip.arrivalTime, now);
    const timeColor = trip.isRealtime ? COLOR_TIME_REALTIME : COLOR_TIME_SCHEDULED;

    const routeWidth = maxRouteWidth;
    const timeWidth = measureText(timeStr);

    const headsignClipStart = routeWidth + 3;
    let headsignClipEnd = width - timeWidth - 2;
    if (trip.isRealtime) headsignClipEnd -= 8;

    const headsign = departureTimeOnly ? '' : (trip.headsign || '');
    const headsignWidth = measureText(headsign);
    const clipWidth = headsignClipEnd - headsignClipStart;
    const overflow = Math.max(0, headsignWidth - clipWidth);
    if (overflow > longestOverflow) longestOverflow = overflow;

    return {
      yOff, routeName, routeColor, timeStr, timeColor,
      routeWidth, timeWidth, showRouteName,
      headsignClipStart, headsignClipEnd,
      headsign, headsignWidth, overflow,
      isRealtime: trip.isRealtime,
    };
  });

  const longestScrollTime = (longestOverflow * 1000) / SCROLL_SPEED;
  const scrollCycleDuration = IDLE_TIME_LEFT + IDLE_TIME_RIGHT + 2 * longestScrollTime;

  for (const layout of tripLayouts) {
    const {
      yOff, routeName, routeColor, timeStr, timeColor,
      timeWidth, showRouteName,
      headsignClipStart, headsignClipEnd,
      headsign, overflow,
      isRealtime,
    } = layout;

    if (showRouteName) {
      renderText(pixels, width, height, routeName, 0, yOff, routeColor);
    }

    renderTextRight(pixels, width, height, timeStr, width + 1, yOff, timeColor);

    if (isRealtime) {
      const iconBRX = width - timeWidth - 2;
      const iconBRY = yOff + NOMINAL_HEIGHT - 6;
      drawRealtimeIcon(pixels, width, height, iconBRX, iconBRY, uptimeMs);
    }

    if (headsign && headsignClipEnd > headsignClipStart) {
      let scrollOffset = 0;
      if (scrollHeadsigns && overflow > 0) {
        scrollOffset = getScrollOffset(overflow, uptimeMs, scrollCycleDuration);
      }
      renderTextClipped(
        pixels, width, height,
        headsign,
        headsignClipStart - scrollOffset,
        yOff,
        COLOR_WHITE,
        headsignClipStart,
        headsignClipEnd
      );
    }
  }

  return pixels;
}
