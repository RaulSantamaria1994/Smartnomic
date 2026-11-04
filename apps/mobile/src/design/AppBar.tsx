import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { es } from '../i18n/es';
import { Icon, type IconName } from './Icon';
import { AppText } from './Text';
import { color, layout, size, spacing } from './tokens';

export interface AppBarStep {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/**
 * Barra superior de Android (especificación 006, RF-601): fondo verde y título blanco. Las
 * pantallas secundarias llevan la flecha atrás; «Mes» y «Calendario», las flechas del mes a
 * los lados del título.
 */
export function AppBar({
  title,
  subtitle,
  onBack,
  prev,
  next,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  prev?: AppBarStep;
  next?: AppBarStep;
}) {
  const insets = useSafeAreaInsets();
  const centered = Boolean(prev || next);
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {onBack && <BarButton icon="arrowBack" label={es.settings.back} onPress={onBack} />}
        {centered && <BarButton icon="back" {...stepProps(prev)} />}
        <View style={[styles.title, centered && styles.centered]}>
          <AppText
            variant="title"
            tone="onAccent"
            numberOfLines={1}
            accessibilityRole="header"
            align={centered ? 'center' : undefined}
          >
            {title}
          </AppText>
          {subtitle && (
            <AppText
              variant="small"
              tone="onAccentMuted"
              numberOfLines={1}
              align={centered ? 'center' : undefined}
            >
              {subtitle}
            </AppText>
          )}
        </View>
        {centered && <BarButton icon="forward" {...stepProps(next)} />}
      </View>
    </View>
  );
}

function stepProps(step: AppBarStep | undefined) {
  return { label: step?.label ?? '', onPress: step?.onPress, disabled: !step || step.disabled };
}

function BarButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: (() => void) | undefined;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      android_ripple={{ color: color.text.onAccentMuted, borderless: true }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} tint={color.text.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.bg.accent },
  row: {
    minHeight: size.appBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  title: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
  centered: { alignItems: 'center' },
  button: {
    width: size.touch + 4,
    height: size.touch + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
