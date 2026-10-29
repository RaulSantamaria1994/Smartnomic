import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { persister } from '../src/cache/cache';
import { watchAppFocus } from '../src/cache/focus';
import { CACHE_MAX_AGE, createQueryClient } from '../src/cache/query-client';
import { useAppFonts } from '../src/design/fonts';
import { color } from '../src/design/tokens';

watchAppFocus();
// La pantalla de carga sigue hasta que está la fuente de la marca.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  // En Android la caché se guarda para verla sin conexión; en la web, no.
  const withCache = (children: ReactNode) =>
    persister ? (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_MAX_AGE }}
      >
        {children}
      </PersistQueryClientProvider>
    ) : (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

  if (!fontsReady) return null;

  return withCache(
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.canvas } }}
      />
    </SafeAreaProvider>,
  );
}
