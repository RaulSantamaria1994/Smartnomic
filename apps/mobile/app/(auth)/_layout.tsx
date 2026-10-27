import { Redirect, Stack, useGlobalSearchParams } from 'expo-router';
import { authClient } from '../../src/session/auth-client';
import { safeNext } from '../../src/session/next';

/** Pantallas sin sesión: si ya hay una, se va a la principal (o a la invitación pendiente). */
export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession();
  const { next } = useGlobalSearchParams<{ next?: string }>();
  if (!isPending && session) return <Redirect href={safeNext(next) ?? '/'} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
