import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, spacing } from '../theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, ...input }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        {...(hint && { accessibilityHint: hint })}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...input}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  input: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  hint: { fontSize: 14, color: colors.muted },
});
