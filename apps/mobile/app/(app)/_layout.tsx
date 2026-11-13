import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NoHousehold } from '../../src/components/NoHousehold';
import { UndoSnackbar } from '../../src/components/UndoSnackbar';
import { useMe } from '../../src/hooks/me';
import { useReminderSync } from '../../src/hooks/useReminderSync';
import { useOutboxSync } from '../../src/outbox/useOutbox';
import { usePushRegistration } from '../../src/push/usePushRegistration';
import { useRealtime } from '../../src/realtime/useRealtime';
import { es } from '../../src/i18n/es';
import { authClient } from '../../src/session/auth-client';
import { sessionEnd } from '../../src/session/session-ended';
import { color } from '../../src/design/tokens';

/** Pantallas que necesitan sesión: sin ella, se va a entrar. */
export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: color.bg.canvas }}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </View>
    );
  }
  if (!session) return <Redirect href="/entrar" />;

  return <SignedIn />;
}

function SignedIn() {
  useEffect(() => sessionEnd.started(), []);
  useReminderSync();
  usePushRegistration();
  useOutboxSync();
  useRealtime();
  const me = useMe();
  // Sin hogares, en lugar de cualquier pantalla de un hogar (especificación 013, RF-1308).
  if (me.data && me.data.households.length === 0) return <NoHousehold />;
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <UndoSnackbar />
    </View>
  );
}
