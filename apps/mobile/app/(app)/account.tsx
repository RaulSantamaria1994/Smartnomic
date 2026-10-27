import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { useMe } from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { remindersSupported } from '../../src/reminders/reminders';
import { signOut } from '../../src/session/sign-out';
import { colors, spacing } from '../../src/theme';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ajustes de cada miembro: sus avisos (RF-030, RF-031) y cerrar sesión. */
export default function Account() {
  const queryClient = useQueryClient();
  const me = useMe();
  const [time, setTime] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const [saving, setSaving] = useState(false);

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
      <Button variant="link" label={es.auth.signOut} onPress={() => void signOut(queryClient)} />
      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '700', color: colors.text },
  label: { fontSize: 16, color: colors.text, flex: 1 },
  muted: { fontSize: 15, color: colors.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
