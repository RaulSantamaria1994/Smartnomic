import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { AppText } from './Text';
import { color, spacing } from './tokens';

interface Props {
  title: string;
  /** Línea secundaria (fecha, nota, estado…). */
  detail?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Etiqueta completa para lectores de pantalla. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  strike?: boolean;
}

/**
 * Fila de lista de Android (especificación 006): icono sin fondo, título y detalle, y a la
 * derecha un importe o un estado, con un separador debajo.
 */
export function ListRow({
  title,
  detail,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  strike,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={onPress ? { color: color.bg.sunken } : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.text}>
        <AppText
          variant="body"
          numberOfLines={1}
          style={strike && styles.strike}
          tone={strike ? 'muted' : 'primary'}
        >
          {title}
        </AppText>
        {typeof detail === 'string' ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </AppText>
        ) : (
          detail
        )}
      </View>
      {trailing}
      {onPress && <Icon name="forward" size={20} tint={color.text.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderBottomWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.bg.surface,
  },
  pressed: { backgroundColor: color.bg.sunken },
  text: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  strike: { textDecorationLine: 'line-through' },
});
