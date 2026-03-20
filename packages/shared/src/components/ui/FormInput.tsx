import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';

interface FormInputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (name: string, value: string) => void;
  type?: 'text' | 'number' | 'url';
  placeholder?: string;
}

export default function FormInput({ label, name, value, onChange, type = 'text', placeholder }: FormInputProps) {
  return (
    <View style={s.container}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={String(value)}
        onChangeText={(text) => onChange(name, text)}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        keyboardType={type === 'number' ? 'numeric' : type === 'url' ? 'url' : 'default'}
        autoCapitalize="none"
        {...(Platform.OS === 'web' ? { type } as Record<string, string> : {})}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: 'white', fontSize: 14 },
});
