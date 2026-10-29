import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { useMembers, useMe } from '../../src/hooks/data';
import { exportHousehold } from '../../src/export/export-household';
import { clearCache } from '../../src/cache/query-client';
import { syncReminders } from '../../src/reminders/reminders';
import { authClient } from '../../src/session/auth-client';
import { es } from '../../src/i18n/es';
import { remindersSupported } from '../../src/reminders/reminders';
import { signOut } from '../../src/session/sign-out';
import { colors, spacing } from '../../src/theme';
import { typography } from '../../src/design/tokens';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ajustes de cada miembro: sus avisos (RF-030, RF-031) y cerrar sesión. */
export default function Account() {
  const queryClient = useQueryClient();
  const me = useMe();
  const [time, setTime] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const [saving, setSaving] = useState(false);
  const members = useMembers(me.data?.household.id);
  const [exporting, setExporting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!me.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  const { household, member } = me.data;

  async function update(input: { remindersEnabled?: boolean; reminderTime?: string }) {
    setMessage(null);
    setSaving(true);
    try {
      await api.updateMyMember(household.id, input);
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      setMessage({ text: es.settings.saved, kind: 'success' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : es.auth.errors.unknown, kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    setMessage(null);
    setExporting(true);
    try {
      await exportHousehold(household.id);
      setMessage({ text: es.account.exported, kind: 'success' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : es.auth.errors.unknown, kind: 'error' });
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleteError(null);
    if (!password) return setDeleteError(es.account.passwordRequired);
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    try {
      await api.deleteAccount(password);
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
      return setDeleteError(e instanceof Error ? e.message : es.auth.errors.unknown);
    }
    // La sesión ya no existe en el servidor: se limpia lo que queda en el dispositivo.
    await Promise.all([clearCache(queryClient), syncReminders([])]);
    await authClient.signOut().catch(() => undefined);
    router.replace('/entrar');
  }

  const memberCount = members.data?.members.length ?? 1;
  const ownerWithOthers = member.role === 'owner' && memberCount > 1;

  function saveTime() {
    const value = (time ?? member.reminderTime).trim();
    if (!TIME.test(value)) return setMessage({ text: es.settings.timeError, kind: 'error' });
    void update({ reminderTime: value });
  }

  return (
    <Screen title={es.settings.title}>
      <Text style={styles.section} accessibilityRole="header">
        {es.settings.reminders}
      </Text>
      {!remindersSupported && <Text style={styles.muted}>{es.settings.webNote}</Text>}
      <View style={styles.switchRow}>
        <Text style={styles.label}>{es.settings.enabled}</Text>
        <Switch
          value={member.remindersEnabled}
          onValueChange={(value) => void update({ remindersEnabled: value })}
          accessibilityLabel={es.settings.enabled}
          disabled={saving}
        />
      </View>
      <TextField
        label={es.settings.time}
        value={time ?? member.reminderTime}
        onChangeText={setTime}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <Button label={es.settings.save} onPress={saveTime} loading={saving} />
      {message && <Message text={message.text} kind={message.kind} />}

      <Text style={styles.section} accessibilityRole="header">
        {es.householdMenu.title}
      </Text>
      <Button
        variant="link"
        label={es.householdMenu.members}
        onPress={() => router.push('/household/members')}
      />
      <Button
        variant="link"
        label={es.householdMenu.settings}
        onPress={() => router.push('/household/settings')}
      />
      <Button
        variant="link"
        label={es.householdMenu.categories}
        onPress={() => router.push('/household/categories')}
      />

      <Text style={styles.section} accessibilityRole="header">
        {es.account.exportTitle}
      </Text>
      <Text style={styles.muted}>{es.account.exportHint}</Text>
      <Button label={es.account.export} onPress={() => void exportData()} loading={exporting} />

      <Text style={styles.section} accessibilityRole="header">
        {es.account.deleteTitle}
      </Text>
      <Text style={styles.muted}>{es.account.deleteHint}</Text>
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
          <Text style={styles.muted}>
            {memberCount > 1 ? es.account.deleteMember : es.account.deleteOnlyMember}
          </Text>
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
            variant="link"
            label={es.account.delete}
            onPress={() => void deleteAccount()}
            loading={deleting}
          />
        </>
      )}

      <Button variant="link" label={es.auth.signOut} onPress={() => void signOut(queryClient)} />
      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.heading, color: colors.text },
  label: { ...typography.body, color: colors.text, flex: 1 },
  muted: { ...typography.body, color: colors.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
