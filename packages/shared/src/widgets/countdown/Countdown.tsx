import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';

interface CountdownConfig { targetDate?: string; targetTime?: string; title?: string; showSeconds?: boolean; style?: 'digital' | 'ring'; }

function getRemainder(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, total: diff };
}

function RingDigit({ value, max, label, color, size }: { value: number; max: number; label: string; color: string; size: number }) {
  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const progress = max > 0 ? (value / max) * circumference : 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
      </Svg>
      <Text style={[st.ringValue, { color, position: 'absolute', top: size / 2 - 14 }]}>{value}</Text>
      <Text style={st.ringLabel}>{label}</Text>
    </View>
  );
}

export default function Countdown({ config, theme, width, height }: WidgetComponentProps) {
  const cc = config as CountdownConfig | undefined;
  const targetDateStr = cc?.targetDate ?? '';
  const targetTimeStr = cc?.targetTime ?? '00:00';
  const title = cc?.title ?? 'Countdown';
  const showSeconds = cc?.showSeconds ?? true;
  const style = cc?.style ?? 'digital';

  const target = targetDateStr ? new Date(`${targetDateStr}T${targetTimeStr}`) : null;
  const [remainder, setRemainder] = useState(target ? getRemainder(target) : { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    if (!target) return;
    const timer = setInterval(() => setRemainder(getRemainder(target)), 1000);
    return () => clearInterval(timer);
  }, [targetDateStr, targetTimeStr]);

  const { scale, designWidth, designHeight } = useAdaptiveFitScale(width, height, { landscape: { w: 400, h: 200 }, portrait: { w: 280, h: 300 } });

  if (!target || isNaN(target.getTime())) {
    return (
      <View style={[st.empty, { backgroundColor: `${theme.primary}40` }]}>
        <Text style={st.emptyText}>No target date set</Text>
      </View>
    );
  }

  const isComplete = remainder.total <= 0;

  if (style === 'ring') {
    const ringSize = 70;
    return (
      <View style={st.container}>
        <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[st.title, { color: theme.accent }]}>{title}</Text>
          {isComplete ? <Text style={st.complete}>Complete!</Text> : (
            <View style={st.ringRow}>
              <RingDigit value={remainder.days} max={365} label="Days" color={theme.accent} size={ringSize} />
              <RingDigit value={remainder.hours} max={24} label="Hours" color={theme.accent} size={ringSize} />
              <RingDigit value={remainder.minutes} max={60} label="Min" color={theme.accent} size={ringSize} />
              {showSeconds && <RingDigit value={remainder.seconds} max={60} label="Sec" color={theme.primary} size={ringSize} />}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[st.title, { color: theme.accent }]}>{title}</Text>
        {isComplete ? <Text style={st.complete}>Complete!</Text> : (
          <View style={st.digitalRow}>
            <View style={st.digitBox}><Text style={[st.digitValue, { color: theme.accent }]}>{remainder.days}</Text><Text style={st.digitLabel}>Days</Text></View>
            <Text style={st.colon}>:</Text>
            <View style={st.digitBox}><Text style={[st.digitValue, { color: theme.accent }]}>{String(remainder.hours).padStart(2, '0')}</Text><Text style={st.digitLabel}>Hours</Text></View>
            <Text style={st.colon}>:</Text>
            <View style={st.digitBox}><Text style={[st.digitValue, { color: theme.accent }]}>{String(remainder.minutes).padStart(2, '0')}</Text><Text style={st.digitLabel}>Min</Text></View>
            {showSeconds && (<><Text style={st.colon}>:</Text><View style={st.digitBox}><Text style={[st.digitValue, { color: theme.accent }]}>{String(remainder.seconds).padStart(2, '0')}</Text><Text style={st.digitLabel}>Sec</Text></View></>)}
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  complete: { color: 'rgba(255,255,255,0.7)', fontSize: 24, fontWeight: '600' },
  ringRow: { flexDirection: 'row', gap: 12 },
  ringValue: { fontSize: 22, fontWeight: '700', textAlign: 'center', width: '100%' },
  ringLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 },
  digitalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  digitBox: { alignItems: 'center' },
  digitValue: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
  digitLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  colon: { color: 'rgba(255,255,255,0.4)', fontSize: 32, fontWeight: '700', marginBottom: 14 },
});

registerWidget({
  type: 'countdown', name: 'Countdown', description: 'Countdown timer to a target date',
  icon: 'hourglass', minW: 2, minH: 2, defaultW: 4, defaultH: 2, component: Countdown,
  defaultProps: { targetDate: '', targetTime: '00:00', title: 'Countdown', showSeconds: true, style: 'digital' },
});
