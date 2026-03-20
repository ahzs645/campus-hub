import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';

interface BottleSpinConfig {
  autoSpin?: boolean;
  spinInterval?: number;
}

export default function BottleSpin({ config, theme, width, height }: WidgetComponentProps) {
  const cfg = config as BottleSpinConfig | undefined;
  const autoSpin = cfg?.autoSpin ?? true;
  const spinInterval = cfg?.spinInterval ?? 5000;

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const currentAngle = useRef(0);
  const [spinning, setSpinning] = useState(false);

  const { scale } = useFitScale(width, height, 200, 200);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);

    const randomExtra = 720 + Math.random() * 1080; // 2-5 full rotations
    const targetAngle = currentAngle.current + randomExtra;

    Animated.timing(rotateAnim, {
      toValue: targetAngle,
      duration: 2000 + Math.random() * 1000,
      useNativeDriver: true,
    }).start(() => {
      currentAngle.current = targetAngle % 360;
      rotateAnim.setValue(currentAngle.current);
      setSpinning(false);
    });
  }, [spinning, rotateAnim]);

  useEffect(() => {
    if (!autoSpin) return;
    // Initial spin after a short delay
    const initialTimer = setTimeout(spin, 500);
    const timer = setInterval(spin, spinInterval);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [autoSpin, spinInterval, spin]);

  const rotation = rotateAnim.interpolate({
    inputRange: [-360, 0, 360, 720, 1080, 1440, 1800, 2160, 2520, 2880, 3240, 3600],
    outputRange: ['-360deg', '0deg', '360deg', '720deg', '1080deg', '1440deg', '1800deg', '2160deg', '2520deg', '2880deg', '3240deg', '3600deg'],
  });

  return (
    <View style={styles.container}>
      <View style={{
        width: 200,
        height: 200,
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Pressable onPress={spin} style={styles.spinArea}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Text style={styles.bottle}>{'\uD83C\uDF7E'}</Text>
          </Animated.View>
          <Text style={[styles.tapText, { color: theme.accent }]}>
            {spinning ? 'Spinning...' : 'Tap to spin!'}
          </Text>
        </Pressable>
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
  spinArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottle: {
    fontSize: 72,
    textAlign: 'center',
  },
  tapText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
});

registerWidget({
  type: 'bottle-spin',
  name: 'Bottle Spin',
  description: 'A spinning bottle that lands at random angles',
  icon: 'wine',
  minW: 2,
  minH: 2,
  defaultW: 2,
  defaultH: 2,
  component: BottleSpin,
  defaultProps: { autoSpin: true, spinInterval: 5000 },
});
