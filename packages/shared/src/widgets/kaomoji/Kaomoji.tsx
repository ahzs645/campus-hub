import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';

interface KaomojiConfig {
  style?: 'happy' | 'sad' | 'angry' | 'random';
  interval?: number;
}

const HAPPY = ['(\u25D5\u203F\u25D5)', '(\uFF61\u25D5\u203F\u25D5\uFF61)', '(\u25E0\u203F\u25E0)', '(\u273F\u25E0\u203F\u25E0)', '(\u25D5\u1D17\u25D5\u273F)'];
const SAD = ['(\u2565_\u2565)', '(\uFF1B_\uFF1B)', '(T_T)', '(\u3063\u02D8\u0329\u256D\u256E\u02D8\u0329)\u3063'];
const ANGRY = ['(\u256C \u00D2\uFE3F\u00D3)', '(\u30CE\u0CA0\u76CA\u0CA0)\u30CE', '(\u2256_\u2256 )', '(\u0CA0_\u0CA0)'];
const ALL = [...HAPPY, ...SAD, ...ANGRY];

function getPool(style: string): string[] {
  switch (style) {
    case 'happy': return HAPPY;
    case 'sad': return SAD;
    case 'angry': return ANGRY;
    default: return ALL;
  }
}

export default function Kaomoji({ config, theme, width, height }: WidgetComponentProps) {
  const cfg = config as KaomojiConfig | undefined;
  const style = cfg?.style ?? 'random';
  const interval = cfg?.interval ?? 3000;

  const pool = getPool(style);

  const pickRandom = useCallback(() => {
    return pool[Math.floor(Math.random() * pool.length)];
  }, [pool]);

  const [kaomoji, setKaomoji] = useState(() => pickRandom());

  const { scale } = useFitScale(width, height, 200, 100);

  useEffect(() => {
    setKaomoji(pickRandom());
    const timer = setInterval(() => {
      setKaomoji(pickRandom());
    }, interval);
    return () => clearInterval(timer);
  }, [style, interval, pickRandom]);

  return (
    <View style={styles.container}>
      <View style={{
        width: 200,
        height: 100,
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={[styles.kaomoji, { color: theme.accent }]}>{kaomoji}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  kaomoji: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
});

registerWidget({
  type: 'kaomoji',
  name: 'Kaomoji',
  description: 'Displays random rotating kaomoji emoticons',
  icon: 'smile',
  minW: 2,
  minH: 1,
  defaultW: 2,
  defaultH: 2,
  component: Kaomoji,
  defaultProps: { style: 'random', interval: 3000 },
});
