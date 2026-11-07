import { HOUSEHOLD_NAME_MAX_LENGTH } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, queryKeys } from '../api/client';
import { AppText } from '../design';
import { spacing } from '../design/tokens';
import { useSwitchHousehold } from '../households/active';
import { es } from '../i18n/es';
import { useOutbox } from '../outbox/useOutbox';
import { sessionEnd } from '../session/session-ended';
import { signOut } from '../session/sign-out';
import { Button } from './Button';
import { Message } from './Message';
import { Screen } from './Screen';
import { TextField } from './TextField';

/**
 * Sin ningún hogar (salió del último, lo quitaron o lo borró): crear uno o unirse con una
 * invitación (especificación 013, RF-1308). Sale en lugar de cualquier pantalla de un hogar.
 */
export function NoHousehold() {
  const queryClient = useQueryClient();
  const switchTo = useSwitchHousehold();
  const outbox = useOutbox();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  async function create() {
    setError(null);
    if (!name.trim()) return setError(es.householdSettings.nameError);
    setCreating(true);
    try {
      const created = await api.createHousehold(name.trim());
      switchTo(created.household.id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : es.auth.errors.unknown);
      setCreating(false);
    }
  }

  const join = () => {
    if (code.trim()) router.push(`/invitacion/${code.trim()}`);
  };

  // Como en «Hogar»: con movimientos sin enviar, se avisa antes de perderlos (RF-1107).
  async function leave(confirmed: boolean) {
    if (outbox.items.length > 0 && !confirmed) return setConfirmSignOut(true);
    sessionEnd.leaving();
    await outbox.clear();
    await signOut(queryClient);
  }

  return (
    <Screen brand title={es.noHousehold.title} align="top">
      <AppText variant="body" tone="muted">
        {es.noHousehold.hint}
      </AppText>

      <View style={styles.section}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {es.households.create}
        </AppText>
        <TextField
          label={es.householdSettings.name}
          value={name}
          onChangeText={setName}
          maxLength={HOUSEHOLD_NAME_MAX_LENGTH}
          onSubmitEditing={() => void create()}
        />
        {error && <Message text={error} />}
        <Button
          label={es.households.createSubmit}
          onPress={() => void create()}
          loading={creating}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {es.noHousehold.joinTitle}
        </AppText>
        <TextField
          label={es.household.joinCode}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          onSubmitEditing={join}
        />
        <Button variant="secondary" label={es.household.join} onPress={join} />
      </View>

      <Button variant="link" label={es.auth.signOut} onPress={() => void leave(false)} />
      {confirmSignOut && (
        <>
          <Message text={es.outbox.signOutWarning(outbox.items.length)} />
          <Button
            variant="danger"
            label={es.outbox.signOutAnyway}
            onPress={() => void leave(true)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.md },
});
