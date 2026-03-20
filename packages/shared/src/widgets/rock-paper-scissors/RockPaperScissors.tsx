import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';

interface RPSConfig {
  autoPlay?: boolean;
  playInterval?: number;
}

type Choice = 'rock' | 'paper' | 'scissors';
type Result = 'P1 Wins' | 'P2 Wins' | 'Draw';

const CHOICES: Choice[] = ['rock', 'paper', 'scissors'];
const EMOJI: Record<Choice, string> = {
  rock: '\uD83E\uDEA8',
  paper: '\uD83D\uDCC4',
  scissors: '\u2702\uFE0F',
};

function getResult(p1: Choice, p2: Choice): Result {
  if (p1 === p2) return 'Draw';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) {
    return 'P1 Wins';
  }
  return 'P2 Wins';
}

function randomChoice(): Choice {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

export default function RockPaperScissors({ config, theme, width, height }: WidgetComponentProps) {
  const cfg = config as RPSConfig | undefined;
  const autoPlay = cfg?.autoPlay ?? true;
  const playInterval = cfg?.playInterval ?? 3000;

  const [p1, setP1] = useState<Choice>(() => randomChoice());
  const [p2, setP2] = useState<Choice>(() => randomChoice());
  const [result, setResult] = useState<Result>(() => getResult(p1, p2));
  const [score, setScore] = useState({ p1: 0, p2: 0 });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { scale } = useFitScale(width, height, 320, 200);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        const newP1 = randomChoice();
        const newP2 = randomChoice();
        const newResult = getResult(newP1, newP2);
        setP1(newP1);
        setP2(newP2);
        setResult(newResult);
        setScore((prev) => ({
          p1: prev.p1 + (newResult === 'P1 Wins' ? 1 : 0),
          p2: prev.p2 + (newResult === 'P2 Wins' ? 1 : 0),
        }));
        // Fade in
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    }, playInterval);
    return () => clearInterval(timer);
  }, [autoPlay, playInterval, fadeAnim, scaleAnim]);

  const resultColor =
    result === 'P1 Wins' ? theme.accent :
    result === 'P2 Wins' ? theme.primary :
    'rgba(255,255,255,0.6)';

  return (
    <View style={styles.container}>
      <View style={{
        width: 320,
        height: 200,
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={styles.title}>Rock Paper Scissors</Text>
        <Text style={styles.scoreText}>
          P1: {score.p1}  |  P2: {score.p2}
        </Text>
        <Animated.View style={[styles.playArea, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.player}>
            <Text style={styles.playerLabel}>P1</Text>
            <Text style={styles.emoji}>{EMOJI[p1]}</Text>
            <Text style={styles.choiceLabel}>{p1}</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.player}>
            <Text style={styles.playerLabel}>P2</Text>
            <Text style={styles.emoji}>{EMOJI[p2]}</Text>
            <Text style={styles.choiceLabel}>{p2}</Text>
          </View>
        </Animated.View>
        <Text style={[styles.result, { color: resultColor }]}>{result}</Text>
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
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontVariant: ['tabular-nums'],
    marginBottom: 8,
  },
  playArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  player: {
    alignItems: 'center',
  },
  playerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  choiceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  vs: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
  },
  result: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
});

registerWidget({
  type: 'rock-paper-scissors',
  name: 'Rock Paper Scissors',
  description: 'Auto-playing rock paper scissors game between two players',
  icon: 'hand',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: RockPaperScissors,
  defaultProps: { autoPlay: true, playInterval: 3000 },
});
