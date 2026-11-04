import { router } from 'expo-router';
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../design/Icon';
import { animate, DURATION, useReduceMotion } from '../design/motion';
import { color, layout, radius, shadow, size, spacing } from '../design/tokens';
import { useCan } from '../hooks/data';
import { es } from '../i18n/es';
import { TAB_BAR_HEIGHT } from './TabBar';

/**
 * Botón flotante «+» de Android, abajo a la derecha sobre la barra de pestañas
 * (especificación 006, RF-605). Abre «Apuntar» al pulsar, mientras el «+» gira un cuarto de
 * vuelta (animación 2): como el «+» es simétrico, al terminar vuelve a 0 sin que se note.
 */
export function Fab() {
  const reduce = useReduceMotion();
  const turn = useRef(new Animated.Value(0)).current;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const press = () => {
    turn.stopAnimation();
    turn.setValue(0);
    animate(turn, 1, DURATION.fast, reduce).start(() => turn.setValue(0));
    router.push('/new');
  };
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={es.tabs.add}
      android_ripple={{ color: color.text.onAccentMuted, borderless: false }}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Icon name="plus" tint={color.text.onAccent} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Capa del botón flotante sobre las pestañas, justo encima de la barra y alineada con el
 * contenido en pantallas anchas. No se muestra a quien solo puede leer. Va en la pantalla y no
 * dentro de la barra: en Android un botón que sobresale de su contenedor no recibe toques, y la
 * altura de la barra no es fija, así que una posición en porcentaje no se aplica.
 */
export function FabLayer() {
  const canWrite = useCan()('transactions.write');
  const insets = useSafeAreaInsets();
  if (!canWrite) return null;
  return (
    <View
      style={[styles.layer, { bottom: insets.bottom + TAB_BAR_HEIGHT + 1 }]}
      pointerEvents="box-none"
    >
      <View style={styles.column} pointerEvents="box-none">
        <Fab />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  column: {
    width: '100%',
    maxWidth: layout.maxWidth,
    height: size.fab + spacing.md * 2,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: size.fab,
    height: size.fab,
    borderRadius: radius.fab,
    backgroundColor: color.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.raised,
  },
  pressed: { opacity: 0.9 },
});
