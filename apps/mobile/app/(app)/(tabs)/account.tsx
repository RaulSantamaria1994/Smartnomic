import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { useCan } from '../../../src/hooks/data';
import { exportHousehold } from '../../../src/export/export-household';
import { es } from '../../../src/i18n/es';
import { remindersSupported } from '../../../src/reminders/reminders';
import { signOut } from '../../../src/session/sign-out';
import { sessionEnd } from '../../../src/session/session-ended';
import { useOutbox } from '../../../src/outbox/useOutbox';
import { AppText, Icon, ListRow, Section, type IconName } from '../../../src/design';
import { color, spacing } from '../../../src/design/tokens';
import { switchColors } from '../../../src/components/switchColors';
import { useHousehold } from '../../../src/households/active';
import { useHouseholdSwitcher } from '../../../src/households/useSwitcher';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Pestaña «Hogar»: miembros, ajustes y categorías del hogar, y los ajustes de cada miembro
 * (avisos, RF-030 y RF-031), exportar, cerrar sesión y el acceso a borrar la cuenta (que tiene
 * su propia pantalla, especificación 015).
 */
export default function Account() {
  const queryClient = useQueryClient();
  const outbox = useOutbox();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { me, household: current, member: currentMember } = useHousehold();
  const switcher = useHouseholdSwitcher();
  const [time, setTime] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const [saving, setSaving] = useState(false);
  const can = useCan();
  const [exporting, setExporting] = useState(false);

  if (!me.data || !current || !currentMember) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  const household = current;
  const member = currentMember;

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

  // Cerrar sesión con movimientos sin enviar los perdería: se avisa y hay que confirmarlo
  // (especificación 011, RF-1107). La bandeja de la cuenta se borra con la sesión.
  async function leave(confirmed: boolean) {
    if (outbox.items.length > 0 && !confirmed) return setConfirmSignOut(true);
    sessionEnd.leaving();
    await outbox.clear();
    await signOut(queryClient);
  }

  function saveTime() {
    const value = (time ?? member.reminderTime).trim();
    if (!TIME.test(value)) return setMessage({ text: es.settings.timeError, kind: 'error' });
    void update({ reminderTime: value });
  }

  return (
    <Screen title={es.tabs.household} switcher={switcher} bleed fab={can('transactions.write')}>
      <Section>
        <MenuRow
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
        <MenuRow
          icon="budget"
          label={es.householdMenu.budgets}
          onPress={() => router.push('/budgets')}
        />
        <MenuRow
          icon="savings"
          label={es.householdMenu.savings}
          onPress={() => router.push('/savings')}
        />
      </Section>

      <Section title={es.settings.reminders} padded separated>
        {!remindersSupported && (
          <AppText variant="caption" tone="muted">
            {es.settings.webNote}
          </AppText>
        )}
        <View style={styles.switchRow}>
          <AppText variant="body" style={styles.flex}>
            {es.settings.enabled}
          </AppText>
          <Switch
            value={member.remindersEnabled}
            {...switchColors()}
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
        <Button variant="secondary" label={es.settings.save} onPress={saveTime} loading={saving} />
        {message && <Message text={message.text} kind={message.kind} />}
      </Section>

      <Section title={es.account.exportTitle} padded separated>
        <AppText variant="caption" tone="muted">
          {es.account.exportHint}
        </AppText>
        <Button
          variant="secondary"
          label={es.account.export}
          onPress={() => void exportData()}
          loading={exporting}
        />
      </Section>

      <Section title={es.account.title} padded separated>
        <Button variant="secondary" label={es.auth.signOut} onPress={() => void leave(false)} />
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
      </Section>

      <Section>
        <MenuRow
          icon="trash"
          label={es.account.deleteTitle}
          onPress={() => router.push('/delete-account')}
        />
      </Section>
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <ListRow
      title={label}
      onPress={onPress}
      accessibilityLabel={label}
      leading={<Icon name={icon} tint={color.text.muted} />}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
