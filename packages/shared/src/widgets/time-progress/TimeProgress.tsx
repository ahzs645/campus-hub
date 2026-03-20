import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';

interface TimeProgressConfig {
  showDay?: boolean;
  showWeek?: boolean;
  showMonth?: boolean;
  showYear?: boolean;
  style?: 'bars' | 'dots';
}

function getProgressData(now: Date) {
  // Day progress
  const dayMs = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;
  const dayPercent = (dayMs / 86400000) * 100;

  // Week progress (Monday = start)
  const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
  const weekMs = dayOfWeek * 86400000 + dayMs;
  const weekPercent = (weekMs / (7 * 86400000)) * 100;

  // Month progress
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthMs = (now.getDate() - 1) * 86400000 + dayMs;
  const monthPercent = (monthMs / (daysInMonth * 86400000)) * 100;

  // Year progress
  const startOfYear = new Date(year, 0, 1).getTime();
  const endOfYear = new Date(year + 1, 0, 1).getTime();
  const yearPercent = ((now.getTime() - startOfYear) / (endOfYear - startOfYear)) * 100;

  return { dayPercent, weekPercent, monthPercent, yearPercent };
}

function ProgressBar({ label, percent, color, style }: { label: string; percent: number; color: string; style: 'bars' | 'dots' }) {
  const pct = Math.min(100, Math.max(0, percent));

  if (style === 'dots') {
    const totalDots = 20;
    const filledDots = Math.round((pct / 100) * totalDots);
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalDots }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i < filledDots ? color : 'rgba(255,255,255,0.15)' },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.percent, { color }]}>{pct.toFixed(1)}%</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.percent, { color }]}>{pct.toFixed(1)}%</Text>
    </View>
  );
}

export default function TimeProgress({ config, theme, width, height }: WidgetComponentProps) {
  const cfg = config as TimeProgressConfig | undefined;
  const showDay = cfg?.showDay ?? true;
  const showWeek = cfg?.showWeek ?? true;
  const showMonth = cfg?.showMonth ?? true;
  const showYear = cfg?.showYear ?? true;
  const progressStyle = cfg?.style ?? 'bars';

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { dayPercent, weekPercent, monthPercent, yearPercent } = getProgressData(now);

  const items: Array<{ label: string; percent: number }> = [];
  if (showDay) items.push({ label: 'Day', percent: dayPercent });
  if (showWeek) items.push({ label: 'Week', percent: weekPercent });
  if (showMonth) items.push({ label: 'Month', percent: monthPercent });
  if (showYear) items.push({ label: 'Year', percent: yearPercent });

  const designH = 40 + items.length * 40;
  const { scale } = useFitScale(width, height, 320, designH);

  return (
    <View style={styles.container}>
      <View style={{
        width: 320,
        height: designH,
        transform: [{ scale }],
        justifyContent: 'center',
        paddingHorizontal: 16,
      }}>
        <Text style={[styles.title, { color: theme.accent }]}>Time Progress</Text>
        {items.map((item) => (
          <ProgressBar
            key={item.label}
            label={item.label}
            percent={item.percent}
            color={theme.accent}
            style={progressStyle}
          />
        ))}
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
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    width: 48,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  dotsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});

registerWidget({
  type: 'time-progress',
  name: 'Time Progress',
  description: 'Shows progress through current day, week, month, and year',
  icon: 'hourglass',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: TimeProgress,
  defaultProps: { showDay: true, showWeek: true, showMonth: true, showYear: true, style: 'bars' },
});
