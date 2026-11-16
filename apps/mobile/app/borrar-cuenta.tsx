import { Redirect, router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { LegalDocument } from '../src/legal/LegalDocument';
import { DELETION_SECTIONS } from '../src/legal/privacy';
import { es } from '../src/i18n/es';
import { authClient } from '../src/session/auth-client';

/**
 * URL web de borrado para Play (RF-1702). Sin sesión, explica y manda a entrar; con
 * sesión, la pantalla de confirmar de hoy.
 */
export default function BorrarCuenta() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) {
    return (
      <Screen title={es.legal.deleteTitle} back>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (session) return <Redirect href="/delete-account" />;
  return (
    <Screen title={es.legal.deleteTitle} back align="top">
      <LegalDocument sections={DELETION_SECTIONS} />
      <Button
        label={es.legal.deleteSignIn}
        onPress={() => router.push({ pathname: '/entrar', params: { next: '/delete-account' } })}
      />
    </Screen>
  );
}
