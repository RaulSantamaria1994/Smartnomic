import { StyleSheet, View } from 'react-native';
import { AppText } from './Text';
import { color, radius, spacing } from './tokens';

export type PillKind = keyof typeof color.status;

/** Etiqueta de estado: texto y color juntos, igual en todas las pantallas (RF-204). */
export function StatusPill({ kind, label }: { kind: PillKind; label: string }) {
  const { fg, bg } = color.status[kind];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="small" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
});
