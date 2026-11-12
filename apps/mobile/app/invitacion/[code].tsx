import type { InvitationPreview } from '@smartnomic/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { formatDay } from '../../src/format';
import { es } from '../../src/i18n/es';
import { authClient } from '../../src/session/auth-client';
import { color, typography } from '../../src/design/tokens';
import { useHousehold, useSwitchHousehold } from '../../src/households/active';

/**
 * Unirse a un hogar con un enlace o un código (T082, RF-005), sin salir de los demás
 * (especificación 013, RF-1302). Sin sesión, manda a
 * entrar o crear la cuenta y vuelve aquí después.
 */
export default function AcceptInvitation() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data: session, isPending } = authClient.useSession();
  const back = `/invitacion/${code}`;

  if (isPending) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen brand title={es.invitation.title}>
        <Text style={styles.text}>{es.invitation.signInFirst}</Text>
        <Button
          label={es.invitation.signIn}
          onPress={() => router.push({ pathname: '/entrar', params: { next: back } })}
        />
        <Button
          variant="link"
          label={es.invitation.signUp}
          onPress={() => router.push({ pathname: '/registro', params: { next: back } })}
        />
      </Screen>
    );
  }
  return <Preview code={code} />;
}

function Preview({ code }: { code: string }) {
  const queryClient = useQueryClient();
  const preview = useQuery({
    queryKey: ['invitation', code],
    queryFn: () => api.previewInvitation(code),
    staleTime: 0,
    gcTime: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { me } = useHousehold();
  const switchTo = useSwitchHousehold();
  const goHome = () => router.replace('/');

  if (preview.isPending) {
    return (
      <Screen brand title={es.invitation.title}>
        <Text style={styles.text}>{es.invitation.loading}</Text>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!preview.data) {
    return (
      <Screen brand title={es.invitation.title}>
        <Message text={preview.error?.message ?? es.auth.errors.unknown} />
        <Button label={es.invitation.goHome} onPress={goHome} />
      </Screen>
    );
  }

  const p = preview.data;
  const blocker = blockerText(p);

  async function accept() {
    setError(null);
    setJoining(true);
    try {
      const before = new Set(me.data?.households.map((h) => h.household.id));
      const after = await api.acceptInvitation(code, false);
      queryClient.setQueryData(queryKeys.me, after);
      // Se entra en el hogar nuevo; los demás siguen ahí (especificación 013, RF-1302).
      const joined = after.households.find((h) => !before.has(h.household.id));
      if (joined) switchTo(joined.household.id);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : es.auth.errors.unknown);
      setJoining(false);
    }
  }

  return (
    <Screen title={es.invitation.joinTo(p.householdName)}>
      {p.invitedBy && <Text style={styles.text}>{es.invitation.invitedBy(p.invitedBy)}</Text>}
      <Text style={styles.text}>{es.invitation.as(es.household.roles[p.role])}</Text>
      {p.state === 'valid' && (
        <Text style={styles.muted}>
          {es.household.expires(formatDay(p.expiresAt.slice(0, 10)))}
        </Text>
      )}

      {blocker ? (
        <Message text={blocker} />
      ) : (
        <>
          {(me.data?.households.length ?? 0) > 0 && (
            <Text style={styles.muted}>{es.invitation.keepOthers}</Text>
          )}
          {error && <Message text={error} />}
          <Button label={es.invitation.accept} onPress={() => void accept()} loading={joining} />
        </>
      )}
      <Button variant="link" label={es.invitation.goHome} onPress={goHome} />
    </Screen>
  );
}

function blockerText(p: InvitationPreview): string | null {
  if (p.state !== 'valid') return es.invitation[p.state];
  if (p.alreadyMember) return es.invitation.alreadyMember;
  if (p.atLimit) return es.invitation.atLimit;
  return null;
}

const styles = StyleSheet.create({
  text: { ...typography.body, color: color.text.primary },
  muted: { ...typography.caption, color: color.text.muted },
});
