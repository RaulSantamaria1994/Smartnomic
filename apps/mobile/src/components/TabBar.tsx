import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '../design/Icon';
import { AppText } from '../design/Text';
import { color, layout, radius, shadow, spacing } from '../design/tokens';
import { useCan } from '../hooks/data';
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
 * Barra inferior (especificación 003, RF-208): Mes, Calendario, «+», Pagos y Hogar. El
 * «+» no es una pestaña: abre «Apuntar» encima y no se muestra a quien solo puede leer.
 */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const canWrite = useCan()('transactions.write');
  const routes = state.routes.filter((route) => TABS[route.name]);
  const tab = (route: (typeof routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const { icon, label } = TABS[route.name]!;
    const onPress = () => {
      if (!focused) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        aria-selected={focused}
        style={styles.tab}
      >
        <Icon name={icon} tint={focused ? color.text.accent : color.text.muted} />
        <AppText
          variant="small"
          tone={focused ? 'accent' : 'muted'}
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      role="navigation"
      aria-label={es.tabs.navigation}
      style={[styles.bar, { paddingBottom: insets.bottom }]}
    >
      <View style={styles.row} accessibilityRole="tablist">
        {routes.slice(0, 2).map(tab)}
        {canWrite && <View style={styles.slot} />}
        {routes.slice(2).map(tab)}
      </View>
      {canWrite && (
        <View style={styles.addLayer} pointerEvents="box-none">
          <Pressable
            onPress={() => router.push('/new')}
            accessibilityRole="button"
            accessibilityLabel={es.tabs.add}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Icon name="plus" size={26} tint={color.text.onAccent} />
          </Pressable>
        </View>
      )}
    </View>
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
  slot: { flex: 1 },
  addLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
  },
  add: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: color.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.lg,
    borderWidth: 4,
    borderColor: color.bg.canvas,
    ...shadow.raised,
  },
  pressed: { opacity: 0.85 },
});
