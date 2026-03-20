import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';

interface SelectOption { value: string; label: string; }

interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  options: SelectOption[];
  onChange: (name: string, value: string) => void;
}

export default function FormSelect({ label, name, value, options, onChange }: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label ?? value;

  return (
    <View style={s.container}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.select} onPress={() => setOpen(!open)}>
        <Text style={s.selectText}>{selectedLabel}</Text>
        <Text style={s.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={s.dropdown}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              style={[s.option, opt.value === value && s.optionActive]}
              onPress={() => { onChange(name, opt.value); setOpen(false); }}
            >
              <Text style={[s.optionText, opt.value === value && s.optionTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12, zIndex: 1 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  select: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { color: 'white', fontSize: 14 },
  chevron: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  dropdown: { backgroundColor: 'rgba(30,30,30,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  option: { paddingHorizontal: 12, paddingVertical: 10 },
  optionActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  optionText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  optionTextActive: { color: 'white', fontWeight: '600' },
});
