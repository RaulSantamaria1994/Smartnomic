import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { UndoSnackbar } from '../../src/components/UndoSnackbar';
import { useReminderSync } from '../../src/hooks/useReminderSync';
import { es } from '../../src/i18n/es';
import { authClient } from '../../src/session/auth-client';
import { colors } from '../../src/theme';

/** Pantallas que necesitan sesión: sin ella, se va a entrar. */
export default function AppLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </View>
    );
  }
  if (!session) return <Redirect href="/entrar" />;

  return <SignedIn />;
}

function SignedIn() {
  useReminderSync();
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <UndoSnackbar />
    </View>
  );
}
