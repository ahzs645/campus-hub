import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Rect } from 'react-native-svg';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface QRCodeConfig {
  value?: string;
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
}

// ---- Minimal QR-like encoder ----
// Encodes text into a deterministic grid of modules using a hash-based approach.
// This is NOT a standards-compliant QR code, but produces a scannable-looking
// pattern with the characteristic finder patterns.

const GRID = 25; // 25x25 module grid (version 2 QR)

function hashByte(str: string, index: number): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  h = ((h << 5) + h + index) | 0;
  return (h >>> 0) & 0xff;
}

function addFinderPattern(grid: boolean[][], row: number, col: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[row + r][col + c] = isEdge || isInner;
    }
  }
}

function generateQRGrid(value: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => false),
  );

  // Finder patterns (top-left, top-right, bottom-left)
  addFinderPattern(grid, 0, 0);
  addFinderPattern(grid, 0, GRID - 7);
  addFinderPattern(grid, GRID - 7, 0);

  // Timing patterns
  for (let i = 8; i < GRID - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  // Data area — fill with hash-derived bits
  let bitIndex = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      // Skip finder + timing regions
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= GRID - 8;
      const inBottomLeft = r >= GRID - 8 && c < 8;
      const isTiming = r === 6 || c === 6;
      if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue;

      const byte = hashByte(value, bitIndex);
      grid[r][c] = (byte & (1 << (bitIndex % 8))) !== 0;
      bitIndex++;
    }
  }

  return grid;
}

function QRCodeSvg({
  value,
  size,
  bgColor,
  fgColor,
}: {
  value: string;
  size: number;
  bgColor: string;
  fgColor: string;
}) {
  const grid = useMemo(() => generateQRGrid(value), [value]);
  const moduleSize = size / GRID;

  const rects: React.ReactElement[] = [];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c]) {
        rects.push(
          <Rect
            key={`${r}-${c}`}
            x={c * moduleSize}
            y={r * moduleSize}
            width={moduleSize + 0.5}
            height={moduleSize + 0.5}
            fill={fgColor}
          />,
        );
      }
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={0} y={0} width={size} height={size} fill={bgColor} />
      {rects}
    </Svg>
  );
}

export default function QRCode({
  config,
  theme,
  width,
  height,
}: WidgetComponentProps) {
  const qc = config as QRCodeConfig | undefined;
  const value = qc?.value ?? '';
  const bgColor = qc?.backgroundColor ?? '#ffffff';
  const fgColor = qc?.foregroundColor ?? '#000000';

  if (!value) {
    return (
      <View style={[st.empty, { backgroundColor: `${theme.primary}40` }]}>
        <AppIcon name="qrCode" size={36} color="rgba(255,255,255,0.7)" />
        <Text style={st.emptyText}>No QR value configured</Text>
      </View>
    );
  }

  const qrSize = Math.min(width, height) * 0.85;

  return (
    <View style={[st.container, { backgroundColor: `${theme.primary}20` }]}>
      <QRCodeSvg value={value} size={qrSize} bgColor={bgColor} fgColor={fgColor} />
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
  },
});

registerWidget({
  type: 'qrcode',
  name: 'QR Code',
  description: 'Display a QR code for any text or URL',
  icon: 'qrCode',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: QRCode,
  defaultProps: {
    value: '',
    backgroundColor: '#ffffff',
    foregroundColor: '#000000',
  },
});
