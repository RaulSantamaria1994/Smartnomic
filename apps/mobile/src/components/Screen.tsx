import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brand } from '../design/Brand';
import { AppText } from '../design/Text';
import { es } from '../i18n/es';
import { color, layout, spacing } from '../design/tokens';

export function Screen({
  title,
  brand,
  children,
}: {
  title?: string;
  /** Muestra la marca encima del título (pantallas sin sesión). */
  brand?: boolean;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {brand && <Brand tagline={es.brand.tagline} />}
          {title && (
            <AppText variant="headline" accessibilityRole="header">
              {title}
            </AppText>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg.canvas },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: layout.maxFormWidth,
    alignSelf: 'center',
  },
});
