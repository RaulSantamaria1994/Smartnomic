import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

/** Mensaje de error o de éxito, anunciado por los lectores de pantalla. */
export function Message({ text, kind = 'error' }: { text: string; kind?: 'error' | 'success' }) {
  return (
    <Text
      style={[styles.text, kind === 'error' ? styles.error : styles.success]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 15 },
  error: { color: colors.error },
  success: { color: colors.success },
});
