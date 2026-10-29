import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { api } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { useCan, useMe } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { colors } from '../../../src/theme';
import { typography } from '../../../src/design/tokens';

/** Nombre del hogar y día de inicio del mes (T092, RF-003). Solo el propietario. */
export default function HouseholdSettings() {
  const queryClient = useQueryClient();
  const me = useMe();
  const canEdit = useCan()('household.update');
  const [name, setName] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const [saving, setSaving] = useState(false);

  const household = me.data?.household;
  if (!household) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  async function save() {
    setMessage(null);
    const nextName = (name ?? household!.name).trim();
    const nextDay = Number((day ?? String(household!.monthStartDay)).trim());
    if (!nextName) return setMessage({ text: es.householdSettings.nameError, kind: 'error' });
    if (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > 28) {
      return setMessage({ text: es.householdSettings.dayError, kind: 'error' });
    }
    setSaving(true);
    try {
      await api.updateHousehold(household!.id, { name: nextName, monthStartDay: nextDay });
      // Cambian los periodos: se recarga todo lo del hogar.
      await queryClient.invalidateQueries();
      setMessage({ text: es.householdSettings.saved, kind: 'success' });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : es.auth.errors.unknown, kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={es.householdSettings.title}>
      {!canEdit && <Text style={styles.muted}>{es.householdSettings.onlyOwner}</Text>}
      <TextField
        label={es.householdSettings.name}
        value={name ?? household.name}
        onChangeText={setName}
        editable={canEdit}
        maxLength={60}
      />
      <TextField
        label={es.householdSettings.monthStartDay}
        value={day ?? String(household.monthStartDay)}
        onChangeText={setDay}
        editable={canEdit}
        keyboardType="number-pad"
        maxLength={2}
        onSubmitEditing={save}
      />
      <Text style={styles.muted}>{es.householdSettings.monthStartHint}</Text>
      {message && <Message text={message.text} kind={message.kind} />}
      {canEdit && <Button label={es.householdSettings.save} onPress={save} loading={saving} />}
      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { ...typography.body, color: colors.muted },
});
