import { Image, StyleSheet, View } from 'react-native';
import icon from '../../assets/icon.png';
import { AppText } from './Text';
import { radius, spacing } from './tokens';

/** Marca de Smartnomic para las pantallas sin sesión: el icono de la app y el nombre. */
export function Brand() {
  return (
    <View style={styles.row}>
      <Image source={icon} style={styles.mark} accessible={false} aria-hidden />
      <AppText variant="heading">Smartnomic</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, marginBottom: spacing.sm },
  mark: { width: 48, height: 48, borderRadius: radius.chip },
});
