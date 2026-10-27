import { Redirect, Stack } from 'expo-router';
import { authClient } from '../../src/session/auth-client';

/** Pantallas sin sesión: si ya hay una, se va a la principal. */
export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession();
  if (!isPending && session) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
