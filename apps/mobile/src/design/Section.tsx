import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './Text';
import { color, spacing } from './tokens';

/**
 * Grupo de una pantalla (especificación 006): subtítulo pequeño en verde y su contenido,
 * sin tarjeta. `padded` deja márgenes para lo que no son filas (textos, formularios).
 */
export function Section({
  title,
  padded,
  separated,
  children,
}: {
  title?: string;
  padded?: boolean;
  /** Línea debajo, para separarlo del grupo siguiente. */
  separated?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, separated && styles.separated]}>
      {title && (
        <AppText variant="label" tone="accent" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
      )}
      <View style={[padded && styles.padded, padded && !title && styles.top]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%' },
  separated: { borderBottomWidth: 1, borderColor: color.border.default },
  title: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  padded: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.ms },
  top: { paddingTop: spacing.md },
});
