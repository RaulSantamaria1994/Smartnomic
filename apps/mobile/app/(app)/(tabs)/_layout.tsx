import { Tabs, useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { TabBar } from '../../../src/components/TabBar';
import { color } from '../../../src/design/tokens';

/**
 * Las pestañas no activas se quedan montadas (conservan su estado) pero ocultas del todo:
 * si no, en la web siguen pintadas debajo y el tabulador llega a sus botones.
 */
function OnlyWhenFocused({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return <View style={[styles.scene, !focused && styles.hidden]}>{children}</View>;
}

/** Pantallas principales con la barra inferior (especificación 003, historia 3). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenLayout={({ children }) => <OnlyWhenFocused>{children}</OnlyWhenFocused>}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg.canvas } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="recurring" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
  hidden: { display: 'none' },
});
