import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../src/api/client';
import { clearCache } from '../../src/cache/query-client';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { AppText } from '../../src/design';
import { spacing } from '../../src/design/tokens';
import { useMembers } from '../../src/hooks/data';
import { useHousehold } from '../../src/households/active';
import { es } from '../../src/i18n/es';
import { useOutbox } from '../../src/outbox/useOutbox';
import { syncReminders } from '../../src/reminders/reminders';
import { authClient } from '../../src/session/auth-client';
import { sessionEnd } from '../../src/session/session-ended';

/**
 * «Borrar mi cuenta» (especificación 015): el flujo que antes vivía al final de «Hogar», sin
 * cambios, en su propia pantalla. Pide la contraseña y una segunda pulsación para confirmar.
 * Al salir de la pantalla se pierde lo escrito, contraseña incluida.
 */
export default function DeleteAccount() {
  const queryClient = useQueryClient();
  const outbox = useOutbox();
  const { me, household, member } = useHousehold();
  const members = useMembers(household?.id);
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!me.data || !household || !member) {
    return (
      <Screen title={es.account.deleteTitle} back>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  const memberCount = members.data?.members.length ?? 1;
  const ownerWithOthers = member.role === 'owner' && memberCount > 1;

  async function deleteAccount() {
    setDeleteError(null);
    if (!password) return setDeleteError(es.account.passwordRequired);
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    try {
      await api.deleteAccount(password);
      // Desde aquí los 401 son por haber borrado la cuenta, no una sesión caducada.
      sessionEnd.leaving();
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      return setDeleteError(e instanceof Error ? e.message : es.auth.errors.unknown);
    }
    // La sesión ya no existe en el servidor: se limpia lo que queda en el dispositivo.
    await Promise.all([clearCache(queryClient), syncReminders([]), outbox.clear()]);
    await authClient.signOut().catch(() => undefined);
    router.replace('/entrar');
  }

  return (
    <Screen title={es.account.deleteTitle} back>
      <View style={styles.body}>
        <AppText variant="body">{es.account.deleteHint}</AppText>
        {ownerWithOthers ? (
          <>
            <Message text={es.account.deleteOwnerFirst} />
            <Button
              variant="link"
              label={es.account.goToMembers}
              onPress={() => router.push('/household/members')}
            />
          </>
        ) : (
          <>
            <AppText variant="caption" tone="muted">
              {memberCount > 1 ? es.account.deleteMember : es.account.deleteOnlyMember}
            </AppText>
            <TextField
              label={es.account.password}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setConfirmDelete(false);
              }}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
            {confirmDelete && <Message text={es.account.confirmDelete} />}
            {deleteError && <Message text={deleteError} />}
            <Button
              variant="destructive"
              label={es.account.delete}
              onPress={() => void deleteAccount()}
              loading={deleting}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
});
