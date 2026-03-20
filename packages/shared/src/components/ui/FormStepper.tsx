import { View, Text, StyleSheet, Pressable } from 'react-native';

interface FormStepperProps {
  label: string;
  name: string;
  value: number;
  onChange: (name: string, value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export default function FormStepper({ label, name, value, onChange, min = 0, max = 100, step = 1, unit = '' }: FormStepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={s.container}>
      <Text style={s.label}>{label}</Text>
      <View style={s.stepper}>
        <Pressable
          style={[s.btn, !canDecrease && s.btnDisabled]}
          onPress={() => canDecrease && onChange(name, Math.max(min, value - step))}
          disabled={!canDecrease}
        >
          <Text style={[s.btnText, !canDecrease && s.btnTextDisabled]}>−</Text>
        </Pressable>
        <Text style={s.value}>{value}{unit ? ` ${unit}` : ''}</Text>
        <Pressable
          style={[s.btn, !canIncrease && s.btnDisabled]}
          onPress={() => canIncrease && onChange(name, Math.min(max, value + step))}
          disabled={!canIncrease}
        >
          <Text style={[s.btnText, !canIncrease && s.btnTextDisabled]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: 'white', fontSize: 18, fontWeight: '600' },
  btnTextDisabled: { color: 'rgba(255,255,255,0.3)' },
  value: { color: 'white', fontSize: 14, fontWeight: '500', minWidth: 48, textAlign: 'center' },
});
