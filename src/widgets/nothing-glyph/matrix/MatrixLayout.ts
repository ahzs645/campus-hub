/**
 * Nothing Phone Glyph Matrix Layout
 * Ported from pauwma/GlyphPendulum & GlyphStack
 *
 * Phone 4a Pro: Diamond shape — 13 rows, 137 pixels
 * Phone 3: Square — 25x25, 625 pixels
 */

const DIAMOND_ROW_WIDTHS = [5, 9, 11, 11, 13, 13, 13, 13, 13, 11, 11, 9, 5];

function computeOffsets(widths: number[]): number[] {
  const offsets = new Array(widths.length);
  let sum = 0;
  for (let i = 0; i < widths.length; i++) {
    offsets[i] = sum;
    sum += widths[i];
  }
  return offsets;
}

export const MatrixLayout = {
  rowWidths: DIAMOND_ROW_WIDTHS,
  totalRows: 13,
  totalPixels: 137,
  maxRowWidth: 13,
  rowOffsets: computeOffsets(DIAMOND_ROW_WIDTHS),

  rowWidth(row: number): number {
    if (row < 0 || row >= this.totalRows) return 0;
    return this.rowWidths[row];
  },

  pixelIndex(row: number, col: number): number {
    if (row < 0 || row >= this.totalRows) return -1;
    const width = this.rowWidths[row];
    if (col < 0 || col >= width) return -1;
    return this.rowOffsets[row] + col;
  },

  centerOffset(row: number): number {
    if (row < 0 || row >= this.totalRows) return 0;
    return Math.floor((this.maxRowWidth - this.rowWidths[row]) / 2);
  },

  /** Set a pixel in maxRowWidth coordinate space with max-blending */
  setPixel(pixels: number[], row: number, col: number, brightness: number): void {
    if (row < 0 || row >= this.totalRows) return;
    const offset = this.centerOffset(row);
    const localCol = col - offset;
    if (localCol < 0 || localCol >= this.rowWidth(row)) return;
    const idx = this.pixelIndex(row, localCol);
    if (idx >= 0 && idx < pixels.length) {
      pixels[idx] = Math.max(pixels[idx], brightness);
    }
  },

  /** Convert flat pixel array to a 13x13 grid with diamond mask for rendering */
  toGrid(pixels: number[]): (number | null)[][] {
    const grid: (number | null)[][] = [];
    for (let row = 0; row < this.totalRows; row++) {
      const gridRow: (number | null)[] = [];
      const offset = this.centerOffset(row);
      const width = this.rowWidths[row];
      for (let col = 0; col < this.maxRowWidth; col++) {
        const localCol = col - offset;
        if (localCol >= 0 && localCol < width) {
          const idx = this.rowOffsets[row] + localCol;
          gridRow.push(pixels[idx] ?? 0);
        } else {
          gridRow.push(null); // not a real pixel
        }
      }
      grid.push(gridRow);
    }
    return grid;
  },
};
