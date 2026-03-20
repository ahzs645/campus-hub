import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle, Line, Rect } from 'react-native-svg';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';

interface ClockConfig {
  showSeconds?: boolean;
  showDate?: boolean;
  format24h?: boolean;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'center' | 'bottom';
  style?: 'digital' | 'analog' | 'mosaic';
}

function AnalogClock({ time, theme, showSeconds }: { time: Date; theme: { primary: string; accent: string }; showSeconds: boolean }) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  const hourMarkers = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const isQuarter = i % 3 === 0;
      const outerR = 88;
      const innerR = isQuarter ? 75 : 80;
      return (
        <Line key={i}
          x1={100 + Math.cos(angle) * innerR} y1={100 + Math.sin(angle) * innerR}
          x2={100 + Math.cos(angle) * outerR} y2={100 + Math.sin(angle) * outerR}
          stroke={theme.accent} strokeWidth={isQuarter ? 3 : 1.5}
          strokeLinecap="round" opacity={isQuarter ? 1 : 0.6}
        />
      );
    }), [theme.accent]);

  const minuteTicks = useMemo(() =>
    Array.from({ length: 60 }).map((_, i) => {
      if (i % 5 === 0) return null;
      const angle = (i * 6 - 90) * (Math.PI / 180);
      return <Circle key={`m-${i}`} cx={100 + Math.cos(angle) * 85} cy={100 + Math.sin(angle) * 85} r={0.8} fill={theme.accent} opacity={0.3} />;
    }), [theme.accent]);

  return (
    <Svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <Circle cx={100} cy={100} r={95} fill="none" stroke={`${theme.accent}30`} strokeWidth={2} />
      <Circle cx={100} cy={100} r={90} fill="none" stroke={`${theme.accent}15`} strokeWidth={1} />
      {hourMarkers}
      {minuteTicks}
      <Line x1={100} y1={100}
        x2={100 + Math.cos((hourAngle - 90) * (Math.PI / 180)) * 50}
        y2={100 + Math.sin((hourAngle - 90) * (Math.PI / 180)) * 50}
        stroke={theme.accent} strokeWidth={4} strokeLinecap="round" />
      <Line x1={100} y1={100}
        x2={100 + Math.cos((minuteAngle - 90) * (Math.PI / 180)) * 70}
        y2={100 + Math.sin((minuteAngle - 90) * (Math.PI / 180)) * 70}
        stroke={theme.accent} strokeWidth={2.5} strokeLinecap="round" />
      {showSeconds && (
        <>
          <Line
            x1={100 - Math.cos((secondAngle - 90) * (Math.PI / 180)) * 15}
            y1={100 - Math.sin((secondAngle - 90) * (Math.PI / 180)) * 15}
            x2={100 + Math.cos((secondAngle - 90) * (Math.PI / 180)) * 78}
            y2={100 + Math.sin((secondAngle - 90) * (Math.PI / 180)) * 78}
            stroke={theme.primary} strokeWidth={1.2} strokeLinecap="round" />
          <Circle cx={100} cy={100} r={3} fill={theme.primary} />
        </>
      )}
      <Circle cx={100} cy={100} r={showSeconds ? 2 : 4} fill={theme.accent} />
    </Svg>
  );
}

function MosaicClock({ time, theme, showSeconds }: { time: Date; theme: { primary: string; accent: string }; showSeconds: boolean }) {
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const hourAngle = (hours + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;
  const cx = 100, cy = 100;

  function handRects(angle: number, length: number, size: number, color: string) {
    const rad = (angle - 90) * (Math.PI / 180);
    const step = size;
    const count = Math.floor(length / step);
    return Array.from({ length: count }).map((_, i) => {
      const d = (i + 1) * step;
      const x = cx + Math.cos(rad) * d - size / 2;
      const y = cy + Math.sin(rad) * d - size / 2;
      return <Rect key={i} x={x} y={y} width={size} height={size} fill={color} />;
    });
  }

  const dots = useMemo(() => {
    const result: React.JSX.Element[] = [];
    const spacing = 9;
    const radius = 85;
    for (let gx = cx - radius; gx <= cx + radius; gx += spacing) {
      for (let gy = cy - radius; gy <= cy + radius; gy += spacing) {
        const dist = Math.sqrt((gx - cx) ** 2 + (gy - cy) ** 2);
        if (dist < radius) {
          result.push(<Circle key={`${gx}-${gy}`} cx={gx} cy={gy} r={2.5} fill={`${theme.accent}20`} />);
        }
      }
    }
    return result;
  }, [theme.accent]);

  return (
    <Svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <Circle cx={cx} cy={cy} r={90} fill={`${theme.accent}15`} />
      {dots}
      {handRects(hourAngle, 45, 12, theme.accent)}
      {handRects(minuteAngle, 72, 12, `${theme.accent}CC`)}
      {showSeconds && handRects(secondAngle, 80, 10, theme.primary)}
      <Rect x={cx - 4.5} y={cy - 4.5} width={9} height={9} fill={theme.accent} />
    </Svg>
  );
}

export default function Clock({ config, theme, width, height }: WidgetComponentProps) {
  const [time, setTime] = useState<Date | null>(null);
  const clockConfig = config as ClockConfig | undefined;
  const showSeconds = clockConfig?.showSeconds ?? false;
  const showDate = clockConfig?.showDate ?? true;
  const format24h = clockConfig?.format24h ?? false;
  const clockStyle = clockConfig?.style ?? 'digital';
  const rawAlignment = clockConfig?.alignment;
  const alignment = rawAlignment === 'left' || rawAlignment === 'center' || rawAlignment === 'right' ? rawAlignment : 'right';
  const rawVA = clockConfig?.verticalAlignment;
  const verticalAlignment = rawVA === 'top' || rawVA === 'center' || rawVA === 'bottom' ? rawVA : 'top';
  const isAnalog = clockStyle === 'analog';
  const isMosaic = clockStyle === 'mosaic';

  const { scale, designWidth: DESIGN_W, designHeight: DESIGN_H } = useAdaptiveFitScale(
    width, height,
    isAnalog || isMosaic
      ? { landscape: { w: 300, h: 260 }, portrait: { w: 240, h: 300 } }
      : { landscape: { w: 320, h: 100 }, portrait: { w: 200, h: 140 } },
  );

  const alignItems = alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center';
  const justifyContent = verticalAlignment === 'top' ? 'flex-start' : verticalAlignment === 'bottom' ? 'flex-end' : 'center';
  const textAlign = alignment;
  const transformOriginX = alignment === 'left' ? 0 : alignment === 'right' ? DESIGN_W : DESIGN_W / 2;
  const transformOriginY = verticalAlignment === 'top' ? 0 : verticalAlignment === 'bottom' ? DESIGN_H : DESIGN_H / 2;

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!time) {
    return (
      <View style={[styles.container, { justifyContent }]}>
        <View style={[styles.skeleton, { alignSelf: alignItems === 'flex-end' ? 'flex-end' : alignItems === 'center' ? 'center' : 'flex-start', backgroundColor: `${theme.accent}20` }]} />
      </View>
    );
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12: !format24h,
  };

  if (isAnalog || isMosaic) {
    return (
      <View style={[styles.container, { justifyContent }]}>
        <View style={{
          width: DESIGN_W, height: DESIGN_H,
          transform: [
            { translateX: -transformOriginX }, { translateY: -transformOriginY },
            { scale }, { translateX: transformOriginX }, { translateY: transformOriginY },
          ],
          alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{ width: 200, height: 200 }}>
            {isMosaic
              ? <MosaicClock time={time} theme={theme} showSeconds={showSeconds} />
              : <AnalogClock time={time} theme={theme} showSeconds={showSeconds} />}
          </View>
          {showDate && (
            <Text style={[styles.dateText, { textAlign: 'center' }]}>
              {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { justifyContent }]}>
      <View style={{
        width: DESIGN_W, height: DESIGN_H,
        transform: [
          { translateX: -transformOriginX }, { translateY: -transformOriginY },
          { scale }, { translateX: transformOriginX }, { translateY: transformOriginY },
        ],
        justifyContent: 'center', alignItems, paddingHorizontal: 16,
      }}>
        <Text style={[styles.timeText, { color: theme.accent, textAlign }]}>
          {time.toLocaleTimeString([], timeOptions)}
        </Text>
        {showDate && (
          <Text style={[styles.dateText, { textAlign }]}>
            {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  timeText: { fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dateText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '500' },
  skeleton: { height: 48, width: 128, borderRadius: 8 },
});

registerWidget({
  type: 'clock',
  name: 'Clock',
  description: 'Displays current time and date',
  icon: 'clock',
  minW: 2, minH: 1, defaultW: 3, defaultH: 1,
  component: Clock,
  defaultProps: { showSeconds: false, showDate: true, format24h: false, alignment: 'right', verticalAlignment: 'top', style: 'digital' },
});
