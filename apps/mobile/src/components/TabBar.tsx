import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '../design/Icon';
import { AppText } from '../design/Text';
import { color, layout, spacing } from '../design/tokens';
import { useCan } from '../hooks/data';
import { es } from '../i18n/es';
import { Fab } from './Fab';

/** Altura de la barra sin el margen inferior del sistema. */
export const TAB_BAR_HEIGHT = 64;

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: es.tabs.month },
  calendar: { icon: 'calendar', label: es.tabs.calendar },
  recurring: { icon: 'recurring', label: es.tabs.recurring },
  account: { icon: 'household', label: es.tabs.household },
};

/**
 * Barra inferior de cuatro pestañas (Mes, Calendario, Pagos y Hogar) con el botón flotante
 * «+» encima, a la derecha (especificación 006, RF-605). El «+» no se muestra a quien solo
 * puede leer.
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
        android_ripple={{ color: color.bg.accentSoft, borderless: true }}
        style={styles.tab}
      >
        <Icon name={icon} tint={focused ? color.text.accent : color.text.muted} />
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
      {canWrite && (
        <View style={styles.fabLayer} pointerEvents="box-none">
          <Fab />
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
  // El botón flotante va justo encima de la barra, alineado con el contenido.
  fabLayer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    height: 88,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
});
