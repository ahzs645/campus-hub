import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';

interface FlashcardConfig {
  cards?: Array<{ front: string; back: string }>;
  autoFlip?: boolean;
  flipInterval?: number;
}

const DEFAULT_CARDS = [
  { front: 'H\u2082O', back: 'Water' },
  { front: 'NaCl', back: 'Sodium Chloride' },
  { front: 'CO\u2082', back: 'Carbon Dioxide' },
  { front: 'O\u2082', back: 'Oxygen' },
];

export default function Flashcard({ config, theme, width, height }: WidgetComponentProps) {
  const cfg = config as FlashcardConfig | undefined;
  const cards = cfg?.cards?.length ? cfg.cards : DEFAULT_CARDS;
  const autoFlip = cfg?.autoFlip ?? true;
  const flipInterval = cfg?.flipInterval ?? 4000;

  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const { scale } = useFitScale(width, height, 280, 180);

  const animateFlip = useCallback((toFlipped: boolean) => {
    Animated.timing(flipAnim, {
      toValue: toFlipped ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [flipAnim]);

  const handleTap = useCallback(() => {
    if (isFlipped) {
      // Flip back and advance card
      setIsFlipped(false);
      animateFlip(false);
      setTimeout(() => {
        setCardIndex((prev) => (prev + 1) % cards.length);
      }, 400);
    } else {
      setIsFlipped(true);
      animateFlip(true);
    }
  }, [isFlipped, animateFlip, cards.length]);

  useEffect(() => {
    if (!autoFlip) return;
    const timer = setInterval(() => {
      setIsFlipped((prev) => {
        if (prev) {
          // Was flipped, flip back then advance
          animateFlip(false);
          setTimeout(() => {
            setCardIndex((idx) => (idx + 1) % cards.length);
          }, 400);
          return false;
        } else {
          // Flip to back
          animateFlip(true);
          return true;
        }
      });
    }, flipInterval);
    return () => clearInterval(timer);
  }, [autoFlip, flipInterval, cards.length, animateFlip]);

  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const card = cards[cardIndex % cards.length];

  return (
    <View style={styles.container}>
      <View style={{
        width: 280,
        height: 180,
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Pressable onPress={handleTap} style={styles.cardWrapper}>
          <Animated.View style={[
            styles.card,
            { backgroundColor: `${theme.primary}90`, borderColor: `${theme.accent}40`, transform: [{ rotateY: frontRotation }], opacity: frontOpacity },
          ]}>
            <Text style={styles.sideLabel}>FRONT</Text>
            <Text style={[styles.cardText, { color: theme.accent }]}>{card.front}</Text>
            <Text style={styles.tapHint}>Tap to flip</Text>
          </Animated.View>
          <Animated.View style={[
            styles.card,
            styles.cardBack,
            { backgroundColor: `${theme.accent}20`, borderColor: `${theme.accent}60`, transform: [{ rotateY: backRotation }], opacity: backOpacity },
          ]}>
            <Text style={styles.sideLabel}>BACK</Text>
            <Text style={[styles.cardText, { color: theme.accent }]}>{card.back}</Text>
            <Text style={styles.counter}>{(cardIndex % cards.length) + 1}/{cards.length}</Text>
          </Animated.View>
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
  cardWrapper: {
    width: 240,
    height: 140,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    paddingHorizontal: 16,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sideLabel: {
    position: 'absolute',
    top: 8,
    left: 12,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  cardText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  tapHint: {
    position: 'absolute',
    bottom: 8,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  counter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontVariant: ['tabular-nums'],
  },
});

registerWidget({
  type: 'flashcard',
  name: 'Flashcard',
  description: 'Interactive flashcards that flip between front and back',
  icon: 'layers',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: Flashcard,
  defaultProps: { cards: DEFAULT_CARDS, autoFlip: true, flipInterval: 4000 },
});
