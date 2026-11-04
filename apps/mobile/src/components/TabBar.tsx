import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '../design/Icon';
import { animate, DURATION, useReduceMotion } from '../design/motion';
import { AppText } from '../design/Text';
import { color, layout, spacing } from '../design/tokens';
import { es } from '../i18n/es';

/** Altura de la barra sin el margen inferior del sistema. */
export const TAB_BAR_HEIGHT = 64;

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: es.tabs.month },
  calendar: { icon: 'calendar', label: es.tabs.calendar },
  recurring: { icon: 'recurring', label: es.tabs.recurring },
  account: { icon: 'household', label: es.tabs.household },
};

/**
 * Barra inferior de cuatro pestañas: Mes, Calendario, Pagos y Hogar (especificación 006,
 * RF-605). El botón flotante «+» va aparte, en `FabLayer`.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const routes = state.routes.filter((route) => TABS[route.name]);
  const reduce = useReduceMotion();
  // El valor vive en la barra: la pestaña elegida se vuelve a pintar al activarse y perdería
  // su animación si la guardara ella.
  const scales = useRef(new Map<string, Animated.Value>()).current;
  const scaleOf = (key: string) => {
    if (!scales.has(key)) scales.set(key, new Animated.Value(1));
    return scales.get(key)!;
  };
  const focusedKey = state.routes[state.index]?.key;
  const firstFocus = useRef(true);
  useEffect(() => {
    if (firstFocus.current || !focusedKey) {
      firstFocus.current = false;
      return;
    }
    const scale = scaleOf(focusedKey);
    scale.stopAnimation();
    scale.setValue(1);
    const half = DURATION.base / 2;
    Animated.sequence([
      animate(scale, 1.15, half, reduce),
      animate(scale, 1, half, reduce),
    ]).start();
    // Solo cuando cambia la pestaña activa.
  }, [focusedKey]);
  const tab = (route: (typeof routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const { icon, label } = TABS[route.name]!;
    return (
      <TabButton
        key={route.key}
        icon={icon}
        label={label}
        focused={focused}
        scale={scaleOf(route.key)}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
      />
    );
  };

  return (
    <View
      role="navigation"
      aria-label={es.tabs.navigation}
      style={[styles.bar, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.row} accessibilityRole="tablist">
        {routes.map(tab)}
      </View>
    </View>
  );
}

/** Una pestaña; al elegirla, su icono crece un poco y vuelve (especificación 006, animación 1). */
function TabButton({
  icon,
  label,
  focused,
  scale,
  onPress,
}: {
  icon: IconName;
  label: string;
  focused: boolean;
  scale: Animated.Value;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      android_ripple={{ color: color.bg.accentSoft, borderless: true }}
      style={styles.tab}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon name={icon} tint={focused ? color.text.accent : color.text.muted} />
      </Animated.View>
      <AppText
        variant="tab"
        tone={focused ? 'accent' : 'muted'}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.bg.surface,
    borderTopWidth: 1,
    borderColor: color.border.default,
  },
  row: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xs,
  },
  tab: {
    minWidth: 0,
    paddingHorizontal: spacing.xxs,
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  label: { maxWidth: '100%' },
});
