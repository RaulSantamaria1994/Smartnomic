import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { AppText } from './Text';
import { color, radius, spacing } from './tokens';

/** Estado vacío amable: icono, texto y, si hay, una acción. */
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
      <View style={styles.badge}>
        <Icon name={icon} tint={color.text.accent} />
      </View>
      <AppText variant="bodyStrong" align="center">
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
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: color.bg.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
