import { defaultShouldDehydrateQuery, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { persistable } from '../src/api/queryKeys';
import { persister } from '../src/cache/cache';
import { watchAppFocus } from '../src/cache/focus';
import { CACHE_BUSTER, CACHE_MAX_AGE, createQueryClient } from '../src/cache/query-client';
import { useAppFonts } from '../src/design/fonts';
import { bindSessionEnd, sessionEnd } from '../src/session/session-ended';
import { color } from '../src/design/tokens';

watchAppFocus();
// La pantalla de carga sigue hasta que está la fuente de la marca.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [queryClient] = useState(() => {
    // Un 401 en cualquier petición: la sesión terminó fuera de la app (caducada o cerrada en
    // otro dispositivo) y se lleva a «Entrar».
    const client = createQueryClient((error) => void sessionEnd.onError(error));
    bindSessionEnd(client);
    return client;
  });
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  // En Android la caché se guarda para verla sin conexión; en la web, no.
  const withCache = (children: ReactNode) =>
    persister ? (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: CACHE_MAX_AGE,
          // Cambia cuando cambia la forma de lo guardado: la caché anterior se descarta en vez
          // de leerse mal (013: `me` con varios hogares).
          buster: CACHE_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              defaultShouldDehydrateQuery(query) && persistable(query.queryKey),
          },
        }}
      >
        {children}
      </PersistQueryClientProvider>
    ) : (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

  if (!fontsReady) return null;

  return withCache(
    <SafeAreaProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.canvas } }}
      />
    </SafeAreaProvider>,
  );
}
