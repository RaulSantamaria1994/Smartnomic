import { useState, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { AppText } from '../design/Text';
import { color, radius, spacing, typography } from '../design/tokens';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  /** Texto fijo a la derecha dentro del campo (por ejemplo, «€»). */
  suffix?: string;
  /** Sin etiqueta visible (en una fila que ya la dice); el lector de pantalla la sigue oyendo. */
  hideLabel?: boolean;
  ref?: Ref<React.ComponentRef<typeof TextInput>>;
}

/** Campo de texto con borde fino y la etiqueta encima (especificación 006). */
export function TextField({
  label,
  hint,
  suffix,
  hideLabel,
  onFocus,
  onBlur,
  ref,
  ...input
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {!hideLabel && (
        <AppText variant="small" tone="muted">
          {label}
        </AppText>
      )}
      <View style={[styles.box, focused && styles.focused]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          {...(hint && { accessibilityHint: hint })}
          placeholderTextColor={color.text.placeholder}
          style={styles.input}
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
        {suffix && (
          <AppText variant="body" tone="muted" accessible={false} aria-hidden>
            {suffix}
          </AppText>
        )}
      </View>
      {hint && (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      )}
    </View>
  );
}

// El borde verde de la caja ya indica el foco; sin esto el navegador añade su recuadro.
// `outlineStyle` existe en la web pero no en los tipos de React Native.
const webWithoutOutline: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.strong,
    borderRadius: radius.control,
    paddingHorizontal: spacing.ms + 2,
    minHeight: 52,
  },
  focused: {
    borderColor: color.border.focus,
    borderWidth: 2,
    paddingHorizontal: spacing.ms + 1,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: color.text.primary,
    minHeight: 48,
    // En la web un <input> no se encoge por debajo de su ancho propio sin esto.
    minWidth: 0,
    ...webWithoutOutline,
  },
});
