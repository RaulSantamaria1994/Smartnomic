import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { es } from '../i18n/es';
import { Icon, type IconName } from './Icon';
import { AppText } from './Text';
import { color, layout, size, spacing } from './tokens';

/** Botón de icono a la derecha de la barra (la lupa de «Mes», especificación 009). */
export interface AppBarAction {
  icon: IconName;
  label: string;
  onPress: () => void;
}

/** El nombre del hogar bajo el título, que abre la lista de hogares (especificación 013). */
export interface AppBarSwitcher {
  name: string;
  label: string;
  onPress: () => void;
}

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
  action,
  switcher,
}: {
  title: string;
  subtitle?: string;
  switcher?: AppBarSwitcher;
  onBack?: () => void;
  prev?: AppBarStep;
  next?: AppBarStep;
  action?: AppBarAction;
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
          {switcher && (
            <Pressable
              onPress={switcher.onPress}
              accessibilityRole="button"
              accessibilityLabel={switcher.label}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
              style={({ pressed }) => [
                styles.switcher,
                centered && styles.switcherCentered,
                pressed && styles.pressed,
              ]}
            >
              <AppText variant="small" tone="onAccentMuted" numberOfLines={1} style={styles.shrink}>
                {switcher.name}
              </AppText>
              <Icon name="expand" size={16} tint={color.text.onAccentMuted} />
            </Pressable>
          )}
          {!switcher && subtitle && (
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
        {action && <BarButton icon={action.icon} label={action.label} onPress={action.onPress} />}
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
    // Sin hueco entre botones: cada uno ya mide 48 px con su margen, y así el título del mes
    // cabe junto a las flechas y la lupa (especificación 009).
    paddingHorizontal: spacing.xs,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  title: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm },
  // Entre las flechas el título ya tiene aire a los lados: sin margen cabe el mes entero.
  centered: { alignItems: 'center', paddingHorizontal: 0 },
  button: {
    width: size.touch + 4,
    height: size.touch + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcher: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  switcherCentered: { alignSelf: 'center' },
  shrink: { flexShrink: 1 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
});
