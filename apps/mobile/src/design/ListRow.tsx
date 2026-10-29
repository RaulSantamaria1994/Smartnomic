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
  /** Sin línea de separación arriba (la primera fila de una tarjeta). */
  first?: boolean;
  strike?: boolean;
}

/** Fila de lista: icono, título y detalle, y a la derecha un importe o una etiqueta. */
export function ListRow({
  title,
  detail,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  first,
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
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.text}>
        <AppText
          variant="bodyStrong"
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
      {onPress && <Icon name="forward" size={18} tint={color.text.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    paddingVertical: spacing.ms,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.border.default },
  pressed: { backgroundColor: color.bg.canvas },
  text: { flex: 1, gap: spacing.xxs, minWidth: 0 },
  strike: { textDecorationLine: 'line-through' },
});
