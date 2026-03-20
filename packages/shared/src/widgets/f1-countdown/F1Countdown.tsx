import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';

interface F1CountdownConfig {
  showFlag?: boolean;
  showCircuit?: boolean;
}

interface Race {
  name: string;
  circuit: string;
  date: string; // ISO date string
  flag: string;
}

const F1_2025_CALENDAR: Race[] = [
  { name: 'Australian GP', circuit: 'Albert Park', date: '2025-03-16T05:00:00Z', flag: '\uD83C\uDDE6\uD83C\uDDFA' },
  { name: 'Chinese GP', circuit: 'Shanghai', date: '2025-03-23T07:00:00Z', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { name: 'Japanese GP', circuit: 'Suzuka', date: '2025-04-06T05:00:00Z', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { name: 'Bahrain GP', circuit: 'Sakhir', date: '2025-04-13T15:00:00Z', flag: '\uD83C\uDDE7\uD83C\uDDED' },
  { name: 'Saudi Arabian GP', circuit: 'Jeddah', date: '2025-04-20T17:00:00Z', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { name: 'Miami GP', circuit: 'Miami International', date: '2025-05-04T19:00:00Z', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { name: 'Emilia Romagna GP', circuit: 'Imola', date: '2025-05-18T13:00:00Z', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { name: 'Monaco GP', circuit: 'Monte Carlo', date: '2025-05-25T13:00:00Z', flag: '\uD83C\uDDF2\uD83C\uDDE8' },
  { name: 'Spanish GP', circuit: 'Barcelona', date: '2025-06-01T13:00:00Z', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { name: 'Canadian GP', circuit: 'Montreal', date: '2025-06-15T18:00:00Z', flag: '\uD83C\uDDE8\uD83C\uDDE6' },
  { name: 'Austrian GP', circuit: 'Red Bull Ring', date: '2025-06-29T13:00:00Z', flag: '\uD83C\uDDE6\uD83C\uDDF9' },
  { name: 'British GP', circuit: 'Silverstone', date: '2025-07-06T14:00:00Z', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { name: 'Belgian GP', circuit: 'Spa-Francorchamps', date: '2025-07-27T13:00:00Z', flag: '\uD83C\uDDE7\uD83C\uDDEA' },
  { name: 'Hungarian GP', circuit: 'Hungaroring', date: '2025-08-03T13:00:00Z', flag: '\uD83C\uDDED\uD83C\uDDFA' },
  { name: 'Dutch GP', circuit: 'Zandvoort', date: '2025-08-31T13:00:00Z', flag: '\uD83C\uDDF3\uD83C\uDDF1' },
  { name: 'Italian GP', circuit: 'Monza', date: '2025-09-07T13:00:00Z', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { name: 'Azerbaijan GP', circuit: 'Baku', date: '2025-09-21T11:00:00Z', flag: '\uD83C\uDDE6\uD83C\uDDFF' },
  { name: 'Singapore GP', circuit: 'Marina Bay', date: '2025-10-05T12:00:00Z', flag: '\uD83C\uDDF8\uD83C\uDDEC' },
  { name: 'United States GP', circuit: 'COTA', date: '2025-10-19T19:00:00Z', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { name: 'Mexico City GP', circuit: 'Hermanos Rodriguez', date: '2025-10-26T20:00:00Z', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
  { name: 'Brazilian GP', circuit: 'Interlagos', date: '2025-11-09T17:00:00Z', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  { name: 'Las Vegas GP', circuit: 'Las Vegas Strip', date: '2025-11-22T06:00:00Z', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { name: 'Qatar GP', circuit: 'Lusail', date: '2025-11-30T14:00:00Z', flag: '\uD83C\uDDF6\uD83C\uDDE6' },
  { name: 'Abu Dhabi GP', circuit: 'Yas Marina', date: '2025-12-07T13:00:00Z', flag: '\uD83C\uDDE6\uD83C\uDDEA' },
];

function getNextRace(): Race | null {
  const now = new Date();
  for (const race of F1_2025_CALENDAR) {
    if (new Date(race.date).getTime() > now.getTime()) {
      return race;
    }
  }
  return null;
}

function getCountdown(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export default function F1Countdown({ config, theme, width, height }: WidgetComponentProps) {
  const cfg = config as F1CountdownConfig | undefined;
  const showFlag = cfg?.showFlag ?? true;
  const showCircuit = cfg?.showCircuit ?? true;

  const [nextRace, setNextRace] = useState<Race | null>(() => getNextRace());
  const [countdown, setCountdown] = useState(() =>
    nextRace ? getCountdown(new Date(nextRace.date)) : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  );

  const { scale } = useFitScale(width, height, 340, 200);

  useEffect(() => {
    const race = getNextRace();
    setNextRace(race);
    if (!race) return;

    const timer = setInterval(() => {
      const updated = getNextRace();
      if (updated && updated.name !== race.name) {
        setNextRace(updated);
      }
      setCountdown(getCountdown(new Date((updated ?? race).date)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!nextRace) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.noRace}>No upcoming races</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{
        width: 340,
        height: 200,
        transform: [{ scale }],
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
      }}>
        <Text style={styles.headerLabel}>NEXT RACE</Text>
        <Text style={[styles.raceName, { color: theme.accent }]}>
          {showFlag ? `${nextRace.flag} ` : ''}{nextRace.name}
        </Text>
        {showCircuit && (
          <Text style={styles.circuit}>{nextRace.circuit}</Text>
        )}
        <View style={styles.countdownRow}>
          <View style={styles.unit}>
            <Text style={[styles.value, { color: theme.accent }]}>{countdown.days}</Text>
            <Text style={styles.unitLabel}>Days</Text>
          </View>
          <Text style={styles.separator}>:</Text>
          <View style={styles.unit}>
            <Text style={[styles.value, { color: theme.accent }]}>{String(countdown.hours).padStart(2, '0')}</Text>
            <Text style={styles.unitLabel}>Hrs</Text>
          </View>
          <Text style={styles.separator}>:</Text>
          <View style={styles.unit}>
            <Text style={[styles.value, { color: theme.accent }]}>{String(countdown.minutes).padStart(2, '0')}</Text>
            <Text style={styles.unitLabel}>Min</Text>
          </View>
          <Text style={styles.separator}>:</Text>
          <View style={styles.unit}>
            <Text style={[styles.value, { color: theme.accent }]}>{String(countdown.seconds).padStart(2, '0')}</Text>
            <Text style={styles.unitLabel}>Sec</Text>
          </View>
        </View>
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
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  raceName: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  circuit: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    marginBottom: 12,
  },
  noRace: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  unit: {
    alignItems: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unitLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 14,
  },
});

registerWidget({
  type: 'f1-countdown',
  name: 'F1 Countdown',
  description: 'Countdown to the next Formula 1 race',
  icon: 'flag',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: F1Countdown,
  defaultProps: { showFlag: true, showCircuit: true },
});
