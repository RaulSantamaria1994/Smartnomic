import type { HouseholdMember, Invitation } from '@smartnomic/api';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Chip } from '../../../src/components/Chip';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { formatDay } from '../../../src/format';
import { useCan, useInvitations, useMe, useMembers } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { invitationLink } from '../../../src/invite-link';
import { shareText } from '../../../src/share';
import { colors, spacing } from '../../../src/theme';

type Invitable = 'editor' | 'viewer';
type Feedback = { text: string; kind: 'error' | 'success' } | null;

/** Miembros del hogar, invitaciones y salir o unirse a otro hogar (T081, RF-004…RF-010). */
export default function Members() {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const can = useCan();
  const manage = can('members.manage');
  const members = useMembers(household?.id);
  const invitations = useInvitations(household?.id, manage);
  const [inviteRole, setInviteRole] = useState<Invitable>('editor');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [code, setCode] = useState('');

  if (!household || !members.data) {
    return (
      <Screen>
        {members.error ? (
          <Message text={members.error.message} />
        ) : (
          <ActivityIndicator accessibilityLabel={es.common.loading} />
        )}
      </Screen>
    );
  }
  const householdId = household.id;

  /** Ejecuta una acción y refresca lo que cambia; las destructivas piden pulsar dos veces. */
  async function run(key: string, action: () => Promise<unknown>, needsConfirm = false) {
    setFeedback(null);
    if (needsConfirm && confirm !== key) return setConfirm(key);
    setConfirm(null);
    setBusy(key);
    try {
      await action();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.members(householdId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.invitations(householdId) }),
      ]);
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : es.auth.errors.unknown, kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  /** Tras salir o pasar la propiedad cambia el hogar: se descarta todo lo cargado. */
  async function switchHousehold(action: () => Promise<unknown>) {
    const next = await action();
    queryClient.setQueryData(queryKeys.me, next);
    await queryClient.invalidateQueries();
  }

  async function share(invitation: Invitation) {
    const link = invitationLink(invitation.code);
    const ok = await shareText(es.household.shareMessage(household!.name, link, invitation.code));
    setFeedback(
      ok
        ? { text: es.household.copied, kind: 'success' }
        : { text: es.household.shareFailed, kind: 'error' },
    );
  }

  const list = members.data.members;
  const pending = invitations.data?.invitations ?? [];

  return (
    <Screen title={es.household.title}>
      <View style={styles.card}>
        {list.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            manage={manage && !m.isMe}
            confirm={confirm}
            busy={busy}
            onRole={(role) => run(`role-${m.id}`, () => api.changeRole(householdId, m.id, role))}
            onRemove={() => run(`remove-${m.id}`, () => api.removeMember(householdId, m.id), true)}
            onTransfer={() =>
              run(
                `transfer-${m.id}`,
                () => switchHousehold(() => api.transferOwnership(householdId, m.id)),
                true,
              )
            }
          />
        ))}
      </View>

      {feedback && <Message text={feedback.text} kind={feedback.kind} />}

      {manage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {es.household.inviteTitle}
          </Text>
          <Text style={styles.muted}>{es.household.inviteAs}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {(['editor', 'viewer'] as const).map((role) => (
              <Chip
                key={role}
                label={es.household.roles[role]}
                selected={inviteRole === role}
                onPress={() => setInviteRole(role)}
              />
            ))}
          </View>
          <Text style={styles.muted}>{es.household.roleHints[inviteRole]}</Text>
          <Button
            label={es.household.createInvitation}
            loading={busy === 'create'}
            onPress={() =>
              run('create', async () => share(await api.createInvitation(householdId, inviteRole)))
            }
          />
          {pending.length > 0 && (
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {es.household.pending}
            </Text>
          )}
          {pending.map((invitation) => (
            <View key={invitation.id} style={styles.invitation}>
              <Text style={styles.label}>
                {es.household.invitationCode}:{' '}
                <Text selectable style={styles.code}>
                  {invitation.code}
                </Text>{' '}
                · {es.household.roles[invitation.role]}
              </Text>
              <Text selectable style={styles.muted}>
                {invitationLink(invitation.code)}
              </Text>
              <Text style={styles.muted}>
                {es.household.expires(formatDay(invitation.expiresAt.slice(0, 10)))}
              </Text>
              <View style={styles.actions}>
                <Button
                  variant="link"
                  label={es.household.share}
                  accessibilityLabel={`${es.household.share} ${invitation.code}`}
                  onPress={() => void share(invitation)}
                />
                <Button
                  variant="link"
                  label={es.household.revoke}
                  accessibilityLabel={`${es.household.revoke} ${invitation.code}`}
                  loading={busy === `revoke-${invitation.id}`}
                  onPress={() =>
                    run(`revoke-${invitation.id}`, () =>
                      api.revokeInvitation(householdId, invitation.id),
                    )
                  }
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {can('household.leave') && (
        <View style={styles.section}>
          {confirm === 'leave' && <Message text={es.household.confirmLeave} />}
          <Button
            variant="link"
            label={es.household.leave}
            loading={busy === 'leave'}
            onPress={() =>
              run('leave', () => switchHousehold(() => api.leaveHousehold(householdId)), true)
            }
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {es.household.joinTitle}
        </Text>
        <TextField
          label={es.household.joinCode}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          onSubmitEditing={() => code.trim() && router.push(`/invitacion/${code.trim()}`)}
        />
        <Button
          label={es.household.join}
          disabled={!code.trim()}
          onPress={() => router.push(`/invitacion/${code.trim()}`)}
        />
      </View>

      <Button
        variant="link"
        label={es.householdMenu.settings}
        onPress={() => router.push('/household/settings')}
      />
      <Button
        variant="link"
        label={es.householdMenu.categories}
        onPress={() => router.push('/household/categories')}
      />
      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

function MemberRow({
  member,
  manage,
  confirm,
  busy,
  onRole,
  onRemove,
  onTransfer,
}: {
  member: HouseholdMember;
  manage: boolean;
  confirm: string | null;
  busy: string | null;
  onRole: (role: Invitable) => void;
  onRemove: () => void;
  onTransfer: () => void;
}) {
  const other: Invitable = member.role === 'editor' ? 'viewer' : 'editor';
  return (
    <View style={styles.row}>
      <Text style={styles.label}>
        {member.name} {member.isMe ? es.household.you : ''}
      </Text>
      <Text style={styles.muted}>{es.household.roles[member.role]}</Text>
      {manage && member.role !== 'owner' && (
        <View style={styles.actions}>
          <Button
            variant="link"
            label={other === 'editor' ? es.household.makeEditor : es.household.makeViewer}
            accessibilityLabel={`${other === 'editor' ? es.household.makeEditor : es.household.makeViewer}: ${member.name}`}
            loading={busy === `role-${member.id}`}
            onPress={() => onRole(other)}
          />
          <Button
            variant="link"
            label={es.household.transfer}
            accessibilityLabel={`${es.household.transfer}: ${member.name}`}
            loading={busy === `transfer-${member.id}`}
            onPress={onTransfer}
          />
          <Button
            variant="link"
            label={es.household.remove}
            accessibilityLabel={`${es.household.remove}: ${member.name}`}
            loading={busy === `remove-${member.id}`}
            onPress={onRemove}
          />
        </View>
      )}
      {confirm === `remove-${member.id}` && (
        <Message text={es.household.confirmRemove(member.name)} />
      )}
      {confirm === `transfer-${member.id}` && (
        <Message text={es.household.confirmTransfer(member.name)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    padding: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  label: { fontSize: 16, color: colors.text, fontWeight: '500' },
  code: { fontWeight: '700', letterSpacing: 1 },
  muted: { fontSize: 14, color: colors.muted },
  chips: { flexDirection: 'row', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  invitation: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
