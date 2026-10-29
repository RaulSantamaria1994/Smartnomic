import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { useMembers, useMe } from '../../../src/hooks/data';
import { exportHousehold } from '../../../src/export/export-household';
import { clearCache } from '../../../src/cache/query-client';
import { syncReminders } from '../../../src/reminders/reminders';
import { authClient } from '../../../src/session/auth-client';
import { es } from '../../../src/i18n/es';
import { remindersSupported } from '../../../src/reminders/reminders';
import { signOut } from '../../../src/session/sign-out';
import { AppText, Card, Icon, ListRow, type IconName } from '../../../src/design';
import { color, radius, spacing } from '../../../src/design/tokens';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Pestaña «Hogar»: miembros, ajustes y categorías del hogar, y los ajustes de cada miembro
 * (avisos, RF-030 y RF-031), exportar, cerrar sesión y borrar la cuenta.
 */
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
    <Screen title={es.tabs.household} align="top">
      <Card padded={false}>
        <MenuRow
          first
          icon="household"
          label={es.householdMenu.members}
          onPress={() => router.push('/household/members')}
        />
        <MenuRow
          icon="settings"
          label={es.householdMenu.settings}
          onPress={() => router.push('/household/settings')}
        />
        <MenuRow
          icon="tag"
          label={es.householdMenu.categories}
          onPress={() => router.push('/household/categories')}
        />
      </Card>

      <AppText variant="heading" accessibilityRole="header">
        {es.settings.reminders}
      </AppText>
      <Card style={styles.card}>
        {!remindersSupported && (
          <AppText variant="caption" tone="muted">
            {es.settings.webNote}
          </AppText>
        )}
        <View style={styles.switchRow}>
          <AppText variant="bodyStrong" style={styles.flex}>
            {es.settings.enabled}
          </AppText>
          <Switch
            value={member.remindersEnabled}
            onValueChange={(value) => void update({ remindersEnabled: value })}
            accessibilityLabel={es.settings.enabled}
            disabled={saving}
            trackColor={{ true: color.text.link, false: color.border.strong }}
          />
        </View>
        <TextField
          label={es.settings.time}
          value={time ?? member.reminderTime}
          onChangeText={setTime}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        <Button variant="secondary" label={es.settings.save} onPress={saveTime} loading={saving} />
        {message && <Message text={message.text} kind={message.kind} />}
      </Card>

      <AppText variant="heading" accessibilityRole="header">
        {es.account.exportTitle}
      </AppText>
      <Card style={styles.card}>
        <AppText variant="caption" tone="muted">
          {es.account.exportHint}
        </AppText>
        <Button
          variant="secondary"
          label={es.account.export}
          onPress={() => void exportData()}
          loading={exporting}
        />
      </Card>

      <AppText variant="heading" accessibilityRole="header">
        {es.account.title}
      </AppText>
      <Card style={styles.card}>
        <Button
          variant="secondary"
          label={es.auth.signOut}
          onPress={() => void signOut(queryClient)}
        />
        <AppText variant="bodyStrong" accessibilityRole="header">
          {es.account.deleteTitle}
        </AppText>
        <AppText variant="caption" tone="muted">
          {es.account.deleteHint}
        </AppText>
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
              variant="danger"
              label={es.account.delete}
              onPress={() => void deleteAccount()}
              loading={deleting}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  first,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  first?: boolean;
}) {
  return (
    <ListRow
      first={first}
      title={label}
      onPress={onPress}
      accessibilityLabel={label}
      leading={
        <View style={styles.menuIcon}>
          <Icon name={icon} tint={color.text.accent} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.ms },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.bg.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
