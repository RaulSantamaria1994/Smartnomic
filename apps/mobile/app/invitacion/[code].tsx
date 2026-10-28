import type { InvitationPreview } from '@smartnomic/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { exportHousehold } from '../../src/export/export-household';
import { formatDay } from '../../src/format';
import { useMe } from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { authClient } from '../../src/session/auth-client';
import { colors, spacing } from '../../src/theme';

/**
 * Unirse a un hogar con un enlace o un código (T082, RF-005, RF-008). Sin sesión, manda a
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
      <Screen title={es.invitation.title}>
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
  const [confirmLoseData, setConfirmLoseData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const myHousehold = useMe().data?.household.id;
  const goHome = () => router.replace('/');

  if (preview.isPending) {
    return (
      <Screen title={es.invitation.title}>
        <Text style={styles.text}>{es.invitation.loading}</Text>
        <ActivityIndicator />
      </Screen>
    );
  }
  if (!preview.data) {
    return (
      <Screen title={es.invitation.title}>
        <Message text={preview.error?.message ?? es.auth.errors.unknown} />
        <Button label={es.invitation.goHome} onPress={goHome} />
      </Screen>
    );
  }

  const p = preview.data;
  const blocker = blockerText(p);
  const needsConfirm = p.currentHousehold === 'delete' && p.currentHouseholdHasData;

  // Antes de perder los datos se ofrece guardarlos (RF-008).
  async function exportFirst() {
    if (!myHousehold) return;
    setError(null);
    setExporting(true);
    try {
      await exportHousehold(myHousehold);
      setExported(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : es.auth.errors.unknown);
    } finally {
      setExporting(false);
    }
  }

  async function accept() {
    setError(null);
    setJoining(true);
    try {
      const me = await api.acceptInvitation(code, confirmLoseData);
      // El hogar ha cambiado: lo cargado del anterior ya no vale.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] });
      queryClient.setQueryData(queryKeys.me, me);
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
          {p.currentHousehold === 'leave' && <Message text={es.invitation.leaveCurrent} />}
          {p.currentHousehold === 'delete' && !p.currentHouseholdHasData && (
            <Text style={styles.muted}>{es.invitation.deleteCurrent}</Text>
          )}
          {needsConfirm && (
            <>
              <Message text={es.invitation.loseData} />
              <Button
                variant="link"
                label={es.invitation.exportFirst}
                onPress={() => void exportFirst()}
                loading={exporting}
              />
              {exported && <Message text={es.invitation.exported} kind="success" />}
              <View style={styles.switchRow}>
                <Text style={styles.label}>{es.invitation.confirmLoseData}</Text>
                <Switch
                  value={confirmLoseData}
                  onValueChange={setConfirmLoseData}
                  accessibilityLabel={es.invitation.confirmLoseData}
                />
              </View>
            </>
          )}
          {error && <Message text={error} />}
          <Button
            label={es.invitation.accept}
            onPress={() => void accept()}
            loading={joining}
            disabled={needsConfirm && !confirmLoseData}
          />
        </>
      )}
      <Button variant="link" label={es.invitation.goHome} onPress={goHome} />
    </Screen>
  );
}

function blockerText(p: InvitationPreview): string | null {
  if (p.state !== 'valid') return es.invitation[p.state];
  if (p.alreadyMember) return es.invitation.alreadyMember;
  if (p.currentHousehold === 'blocked') return es.invitation.blocked;
  return null;
}

const styles = StyleSheet.create({
  text: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  label: { fontSize: 16, color: colors.text, flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
