import { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface NothingGlyphConfig {
  glyphPattern?: string;
  speed?: number;
  brightness?: number;
}

// Glyph patterns defined as grids of dots (1 = on, 0 = off)
const PATTERNS: Record<string, number[][]> = {
  ring: [
    [0, 0, 1, 1, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 1, 1, 0, 0],
  ],
  cross: [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ],
  diamond: [
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ],
  dots: [
    [1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1],
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 1, 0, 1],
  ],
  wave: [
    [0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 1, 0],
  ],
};

export default function NothingGlyph({ config, theme, width, height }: WidgetComponentProps) {
  const cc = config as NothingGlyphConfig | undefined;
  const patternName = cc?.glyphPattern ?? 'ring';
  const speed = cc?.speed ?? 1;
  const brightness = Math.max(0.2, Math.min(1, cc?.brightness ?? 0.8));

  const pattern = PATTERNS[patternName] ?? PATTERNS.ring;

  // Count active dots and create animation values
  const activeDots = useMemo(() => {
    const dots: { row: number; col: number; index: number }[] = [];
    let index = 0;
    pattern.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val === 1) {
          dots.push({ row: r, col: c, index });
          index++;
        }
      });
    });
    return dots;
  }, [pattern]);

  // Create animated values for each dot
  const animValues = useRef<Animated.Value[]>([]);
  if (animValues.current.length !== activeDots.length) {
    animValues.current = activeDots.map(() => new Animated.Value(0.3));
  }

  useEffect(() => {
    const duration = Math.max(400, 2000 / speed);

    const animations = activeDots.map((dot, idx) => {
      const delay = (idx / activeDots.length) * duration;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValues.current[idx], {
            toValue: brightness,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animValues.current[idx], {
            toValue: 0.15,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      );
    });

    const composite = Animated.parallel(animations);
    composite.start();

    return () => composite.stop();
  }, [activeDots, speed, brightness]);

  const rows = pattern.length;
  const cols = pattern[0]?.length ?? 0;
  const dotAreaW = Math.min(width, height) * 0.75;
  const dotSize = Math.max(4, Math.floor(dotAreaW / Math.max(rows, cols)) - 4);
  const gap = Math.max(2, dotSize * 0.4);

  // Build a lookup for active dot index
  const dotIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    activeDots.forEach((d, idx) => map.set(`${d.row}-${d.col}`, idx));
    return map;
  }, [activeDots]);

  return (
    <View style={[s.container, { width, height, backgroundColor: `${theme.primary}20` }]}>
      <View style={s.glyphGrid}>
        {pattern.map((row, r) => (
          <View key={r} style={[s.glyphRow, { gap }]}>
            {row.map((val, c) => {
              const activeIdx = dotIndexMap.get(`${r}-${c}`);
              if (val === 1 && activeIdx !== undefined) {
                return (
                  <Animated.View
                    key={c}
                    style={[
                      s.dot,
                      {
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: theme.accent,
                        opacity: animValues.current[activeIdx],
                      },
                    ]}
                  />
                );
              }
              return (
                <View
                  key={c}
                  style={[
                    s.dot,
                    {
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      {/* Pattern label */}
      <Text style={s.patternLabel}>{patternName}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  glyphGrid: { alignItems: 'center', justifyContent: 'center' },
  glyphRow: { flexDirection: 'row' },
  dot: {},
  patternLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '500', marginTop: 8, textTransform: 'uppercase', letterSpacing: 2 },
});

registerWidget({
  type: 'nothing-glyph',
  name: 'Nothing Glyph',
  description: 'Animated glyph pattern inspired by Nothing Phone LEDs',
  icon: 'sparkles',
  minW: 2, minH: 2, defaultW: 2, defaultH: 2,
  component: NothingGlyph,
  defaultProps: { glyphPattern: 'ring', speed: 1, brightness: 0.8 },
});
