import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRef, useEffect } from 'react';

interface FormSwitchProps {
  label: string;
  name: string;
  value: boolean;
  onChange: (name: string, value: boolean) => void;
}

export default function FormSwitch({ label, name, value, onChange }: FormSwitchProps) {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, { toValue: value ? 20 : 0, duration: 200, useNativeDriver: true }).start();
  }, [value]);

  return (
    <Pressable style={s.container} onPress={() => onChange(name, !value)}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.track, value ? s.trackOn : s.trackOff]}>
        <Animated.View style={[s.thumb, { transform: [{ translateX }] }]} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 4 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', flex: 1 },
  track: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  trackOn: { backgroundColor: 'rgba(100,200,100,0.6)' },
  trackOff: { backgroundColor: 'rgba(255,255,255,0.2)' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white' },
});
