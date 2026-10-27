import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, queryKeys } from '../api/client';
import { es } from '../i18n/es';
import { useUndo } from '../state/undo';
import { colors, spacing } from '../theme';

const UNDO_WINDOW_MS = 6000;

/** «Movimiento borrado · Deshacer» durante unos segundos (especificación 001, RF-014). */
export function UndoSnackbar() {
  const pending = useUndo((state) => state.pending);
  const dismiss = useUndo((state) => state.dismiss);
  const offer = useUndo((state) => state.offer);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(dismiss, UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [pending, dismiss]);

  if (!pending) return null;

  async function undo() {
    if (!pending) return;
    const { householdId, transactionId } = pending;
    dismiss();
    try {
      await api.restoreTransaction(householdId, transactionId);
    } catch {
      // Sin conexión u otro fallo: se vuelve a ofrecer para reintentarlo.
      offer(householdId, transactionId);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.periods(householdId) });
  }

  return (
    <View
      style={[styles.bar, { bottom: insets.bottom + spacing.md }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{es.month.deleted}</Text>
      <Pressable onPress={undo} accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{es.month.undo}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.text,
    borderRadius: 8,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { color: colors.onPrimary, fontSize: 15 },
  action: { padding: spacing.md, minHeight: 48, justifyContent: 'center' },
  actionText: { color: '#9EC1FF', fontSize: 15, fontWeight: '700' },
});
