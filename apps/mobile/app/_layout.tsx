import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { persister } from '../src/cache/cache';
import { CACHE_MAX_AGE, createQueryClient } from '../src/cache/query-client';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

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

  return withCache(
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>,
  );
}
