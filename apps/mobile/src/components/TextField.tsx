import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from '../design/Text';
import { color, radius, spacing, typography } from '../design/tokens';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
}

export function TextField({ label, hint, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        {...(hint && { accessibilityHint: hint })}
        placeholderTextColor={color.text.muted}
        style={[styles.input, focused && styles.focused]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...input}
      />
      {hint && (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: color.text.primary,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.strong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    // En la web un <input> no se encoge por debajo de su ancho propio sin esto.
    minWidth: 0,
  },
  focused: { borderColor: color.border.focus, borderWidth: 2, paddingHorizontal: spacing.md - 1 },
});
