import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, queryKeys } from '../api/client';
import { AppText } from '../design';
import { es } from '../i18n/es';
import { continueWithGoogle } from '../session/google';
import { Button } from './Button';

/**
 * Botón «Continuar con Google» si el servidor lo tiene configurado (especificación 016).
 * Si la consulta falla, no se muestra.
 */
export function ContinueWithGoogle({
  next,
  onError,
}: {
  next: string | null;
  onError: (message: string | null) => void;
}) {
  const options = useQuery({
    queryKey: queryKeys.loginOptions,
    queryFn: api.loginOptions,
    staleTime: 60_000,
    retry: false,
  });
  const [loading, setLoading] = useState(false);
  if (!options.data?.google) return null;

  async function press() {
    onError(null);
    setLoading(true);
    const result = await continueWithGoogle(next ?? '/');
    setLoading(false);
    if (result === 'cancel') return;
    if (result !== 'ok') return onError(result.error);
    router.replace(next ?? '/');
  }

  return (
    <>
      <Button
        variant="secondary"
        label={es.auth.google.continue}
        onPress={() => void press()}
        loading={loading}
      />
      <AppText variant="caption" tone="muted">
        {es.auth.google.privacy}
      </AppText>
    </>
  );
}
