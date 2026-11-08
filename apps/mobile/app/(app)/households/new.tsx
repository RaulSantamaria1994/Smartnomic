import { HOUSEHOLD_NAME_MAX_LENGTH } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { useSwitchHousehold } from '../../../src/households/active';
import { es } from '../../../src/i18n/es';

/**
 * Crear un hogar del que se es propietario, con las categorías de siempre (especificación 013,
 * RF-1305). Al crearlo, la app pasa a él.
 */
export default function NewHousehold() {
  const queryClient = useQueryClient();
  const switchTo = useSwitchHousehold();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setError(null);
    if (!name.trim()) return setError(es.householdSettings.nameError);
    setSaving(true);
    try {
      const created = await api.createHousehold(name.trim());
      // Primero la lista nueva y luego elegirlo: así no se ve un momento otro hogar.
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      switchTo(created.household.id);
      router.dismissAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.auth.errors.unknown);
      setSaving(false);
    }
  }

  return (
    <Screen title={es.households.create} back>
      <TextField
        label={es.householdSettings.name}
        value={name}
        onChangeText={setName}
        maxLength={HOUSEHOLD_NAME_MAX_LENGTH}
        onSubmitEditing={() => void create()}
      />
      {error && <Message text={error} />}
      <Button label={es.households.createSubmit} onPress={() => void create()} loading={saving} />
    </Screen>
  );
}
