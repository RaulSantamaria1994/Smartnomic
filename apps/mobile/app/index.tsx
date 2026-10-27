import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../src/api/client';
import { Button } from '../src/components/Button';
import { Message } from '../src/components/Message';
import { Screen } from '../src/components/Screen';
import { es } from '../src/i18n/es';
import { authClient } from '../src/session/auth-client';
import { colors, spacing } from '../src/theme';

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: api.me, enabled: Boolean(session) });

  if (isPending) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (!session) return <Redirect href="/entrar" />;

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
  }

  return (
    <Screen title={es.home.greeting(session.user.name)}>
      {me.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
      {me.error && (
        <>
          <Message text={me.error.message} />
          <Button label={es.common.retry} onPress={() => me.refetch()} />
        </>
      )}
      {me.data && (
        <View style={styles.card}>
          <Text style={styles.label}>{es.home.household}</Text>
          <Text style={styles.value}>{me.data.household.name}</Text>
          <Text style={styles.muted}>{es.home.roles[me.data.member.role]}</Text>
        </View>
      )}
      <Text style={styles.muted}>{es.home.comingSoon}</Text>
      <Button variant="link" label={es.auth.signOut} onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: { fontSize: 14, color: colors.muted },
  value: { fontSize: 20, fontWeight: '600', color: colors.text },
  muted: { fontSize: 15, color: colors.muted },
});
