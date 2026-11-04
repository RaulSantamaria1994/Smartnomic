import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { AppText } from './Text';
import { color, spacing } from './tokens';

/** Estado vacío: icono gris, texto y, si hay, una acción. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.box}>
      <Icon name={icon} size={32} tint={color.text.muted} />
      <AppText variant="body" align="center">
        {title}
      </AppText>
      {hint && (
        <AppText variant="caption" tone="muted" align="center">
          {hint}
        </AppText>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
});
