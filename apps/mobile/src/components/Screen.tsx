import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, type ReactElement, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, type AppBarStep } from '../design/AppBar';
import { Brand } from '../design/Brand';
import { AppText } from '../design/Text';
import { color, layout, size, spacing } from '../design/tokens';

/** Vuelve a la pantalla anterior o, si se entró por un enlace directo, a «Mes». */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Screen({
  title,
  subtitle,
  back,
  prev,
  next,
  brand,
  align = 'center',
  bleed,
  fab,
  refreshControl,
  children,
}: {
  /** Título de la barra superior (o, con `brand`, de la pantalla). */
  title?: string;
  subtitle?: string;
  /** Flecha atrás en la barra; `true` usa `goBack`. */
  back?: boolean | (() => void);
  /** Flechas a los lados del título (cambio de mes). */
  prev?: AppBarStep;
  next?: AppBarStep;
  /** Pantallas sin sesión: marca y título dentro del contenido, sin barra superior. */
  brand?: boolean;
  /** Los formularios cortos sin sesión van centrados; el resto, arriba. */
  align?: 'center' | 'top';
  /** Sin márgenes laterales ni separación: listas de borde a borde. */
  bleed?: boolean;
  /** Deja sitio abajo para el botón flotante «+». */
  fab?: boolean;
  /** Tirar hacia abajo para recargar. */
  refreshControl?: ReactElement<RefreshControlProps>;
  children: ReactNode;
}) {
  const bar = Boolean(title && !brand);
  // Barra verde: iconos claros arriba; pantallas blancas sin barra: oscuros.
  useFocusEffect(useCallback(() => setStatusBarStyle(bar ? 'light' : 'dark'), [bar]));
  return (
    <SafeAreaView style={styles.safe} edges={bar ? ['left', 'right'] : undefined}>
      {bar && title && (
        <AppBar
          title={title}
          subtitle={subtitle}
          onBack={back === true ? goBack : back || undefined}
          prev={prev}
          next={next}
        />
      )}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            bar ? styles.top : align === 'top' && styles.top,
            bar && styles.wide,
            bleed && styles.bleed,
            fab && styles.fab,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {brand && <Brand />}
          {brand && title && (
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
    padding: spacing.md,
    width: '100%',
    maxWidth: layout.maxFormWidth,
    alignSelf: 'center',
  },
  top: { justifyContent: 'flex-start' },
  wide: { maxWidth: layout.maxWidth },
  bleed: { paddingHorizontal: 0, paddingTop: 0, gap: 0 },
  fab: { paddingBottom: size.fab + spacing.md * 2 },
});
