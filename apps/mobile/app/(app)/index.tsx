import type { Category, RecurringRule, Transaction, UpcomingOccurrenceDto } from '@smartnomic/api';
import { periodOf, shiftPeriod, type DateString } from '@smartnomic/domain';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../src/api/http';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { ReminderBanners } from '../../src/components/ReminderBanners';
import {
  formatDay,
  formatDueDate,
  formatMoney,
  formatPeriod,
  formatSignedMoney,
} from '../../src/format';
import {
  currentPeriodStart,
  useCan,
  useCategories,
  useMe,
  useMembers,
  usePeriod,
  useRecurring,
  useUpcoming,
} from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { signOut } from '../../src/session/sign-out';
import { colors, spacing } from '../../src/theme';

/** Pantalla «Mes»: resumen del periodo, lista de movimientos y botón para apuntar. */
export default function Month() {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const [start, setStart] = useState<DateString | null>(null);
  const periodStart =
    start ??
    (household ? currentPeriodStart(household.timezone, household.monthStartDay) : undefined);
  const period = usePeriod(household?.id, periodStart);
  const categories = useCategories(household?.id);
  const upcoming = useUpcoming(household?.id);
  const rules = useRecurring(household?.id);
  const can = useCan();
  const canWrite = can('transactions.write');
  const members = useMembers(household?.id);

  if (me.isPending) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </SafeAreaView>
    );
  }
  if (!household || !periodStart) {
    return (
      <SafeAreaView style={styles.center}>
        <Message text={me.error?.message ?? es.auth.errors.unknown} />
        <Button label={es.common.retry} onPress={() => me.refetch()} />
      </SafeAreaView>
    );
  }

  const current = periodOf(periodStart, household.monthStartDay);
  const move = (n: number) => setStart(shiftPeriod(current, n, household.monthStartDay).start);
  const byId = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));
  // Se dice quién apuntó cada movimiento (RF-009), salvo si el hogar es de una sola persona
  // y lo apuntó ella.
  const memberList = members.data?.members ?? [];
  const names = new Map(memberList.map((m) => [m.id, m.name]));
  const shared = memberList.length > 1;
  const authorOf = (t: Transaction) =>
    members.data && (shared || t.memberId !== me.data?.member.id)
      ? (t.memberId && names.get(t.memberId)) || es.household.formerMember
      : null;
  const offline = period.error instanceof ApiError && period.error.code === 'network';
  const data = period.data;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={period.isRefetching}
            onRefresh={() => {
              void period.refetch();
              void categories.refetch();
              void upcoming.refetch();
              void rules.refetch();
              void members.refetch();
            }}
          />
        }
      >
        <View style={styles.topBar}>
          <Text style={styles.appName}>{es.appName}</Text>
          <Pressable
            onPress={() => router.push('/household/members')}
            accessibilityRole="link"
            accessibilityLabel={es.household.title}
            style={[styles.sectionAction, styles.pushRight]}
          >
            <Text style={styles.link}>{es.household.open}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/account')}
            accessibilityRole="link"
            accessibilityLabel={es.settings.title}
            style={styles.sectionAction}
          >
            <Text style={styles.link}>{es.settings.open}</Text>
          </Pressable>
        </View>
        <View style={styles.header}>
          <Pressable
            onPress={() => move(-1)}
            accessibilityRole="button"
            accessibilityLabel={es.month.previous}
            style={styles.arrow}
          >
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Text style={styles.period} accessibilityRole="header">
            {formatPeriod(current, household.monthStartDay)}
          </Text>
          <Pressable
            onPress={() => move(1)}
            accessibilityRole="button"
            accessibilityLabel={es.month.next}
            style={styles.arrow}
          >
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>

        {offline && <Message text={es.month.offline} />}

        <ReminderBanners
          occurrences={upcoming.data?.occurrences}
          today={upcoming.data?.today}
          hasRules={(rules.data?.rules.length ?? 0) > 0}
          remindersEnabled={me.data?.member.remindersEnabled ?? true}
        />

        <View style={styles.summary}>
          <Total label={es.month.income} cents={data?.summary.incomeCents} color={colors.success} />
          <Total
            label={es.month.expenses}
            cents={data?.summary.expenseCents}
            color={colors.error}
          />
          <Total
            label={es.month.balance}
            cents={data?.summary.balanceCents}
            color={colors.text}
            strong
          />
        </View>

        <Upcoming
          items={upcoming.data?.occurrences}
          today={upcoming.data?.today}
          rules={rules.data?.rules}
          categories={byId}
          canResolve={can('occurrences.resolve')}
        />

        {period.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
        {period.error && !offline && !data && <Message text={period.error.message} />}

        {data && data.transactions.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{es.month.empty}</Text>
            {canWrite && <Text style={styles.muted}>{es.month.emptyHint}</Text>}
          </View>
        )}

        {data && data.transactions.length > 0 && (
          <View style={styles.list}>
            {data.transactions.map((t) => (
              <Row
                key={t.id}
                transaction={t}
                category={byId.get(t.categoryId)}
                author={authorOf(t)}
                onPress={canWrite ? () => router.push(`/transaction/${t.id}`) : undefined}
              />
            ))}
          </View>
        )}

        <Button variant="link" label={es.auth.signOut} onPress={() => void signOut(queryClient)} />
      </ScrollView>

      {canWrite && (
        <View style={styles.fab}>
          <Button label={`+ ${es.month.add}`} onPress={() => router.push('/new')} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** «Próximos pagos»: atrasados y de los próximos 30 días (RF-023). */
function Upcoming({
  items,
  today,
  rules,
  categories,
  canResolve,
}: {
  items: UpcomingOccurrenceDto[] | undefined;
  today: string | undefined;
  rules: RecurringRule[] | undefined;
  categories: Map<string, Category>;
  canResolve: boolean;
}) {
  if (!items || !today || !rules) return null;
  const byId = new Map(rules.map((r) => [r.id, r]));
  return (
    <View style={styles.upcoming}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {es.recurring.upcomingTitle}
        </Text>
        <Pressable
          onPress={() => router.push('/recurring')}
          accessibilityRole="link"
          accessibilityLabel={es.recurring.title}
          style={styles.sectionAction}
        >
          <Text style={styles.link}>{es.recurring.manage}</Text>
        </Pressable>
      </View>
      {rules.length === 0 && (
        <Text style={[styles.muted, styles.sectionNote]}>{es.recurring.empty}</Text>
      )}
      {rules.length > 0 && items.length === 0 && (
        <Text style={[styles.muted, styles.sectionNote]}>{es.recurring.noUpcoming}</Text>
      )}
      {items.map((item) => {
        const rule = byId.get(item.ruleId);
        if (!rule) return null;
        const category = categories.get(rule.categoryId);
        const when = formatDueDate(item.dueDate, today);
        return (
          <Pressable
            key={`${item.ruleId}-${item.dueDate}`}
            disabled={!canResolve}
            onPress={() => router.push(`/occurrence/${item.ruleId}/${item.dueDate}`)}
            accessibilityRole={canResolve ? 'button' : 'text'}
            accessibilityLabel={`${rule.name}, ${formatMoney(rule.amountCents)}, ${when}${item.overdue ? `, ${es.recurring.overdue}` : ''}`}
            style={({ pressed }) => [
              styles.row,
              item.overdue && styles.overdueRow,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.icon}>{category?.icon ?? '•'}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{rule.name}</Text>
              <Text
                style={[styles.muted, item.overdue && { color: colors.error, fontWeight: '600' }]}
              >
                {item.overdue ? `${es.recurring.overdue} · ${when}` : when}
              </Text>
            </View>
            <Text
              style={[
                styles.rowAmount,
                { color: rule.kind === 'income' ? colors.success : colors.text },
              ]}
            >
              {formatMoney(rule.amountCents)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Total({
  label,
  cents,
  color,
  strong,
}: {
  label: string;
  cents: number | undefined;
  color: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.total}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.totalValue, { color }, strong && styles.strong]}>
        {cents === undefined ? '—' : formatMoney(cents)}
      </Text>
    </View>
  );
}

function Row({
  transaction,
  category,
  author,
  onPress,
}: {
  transaction: Transaction;
  category: Category | undefined;
  author: string | null;
  onPress: (() => void) | undefined;
}) {
  const amount = formatSignedMoney(transaction.amountCents, transaction.kind);
  const name = category?.name ?? '—';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${name}, ${amount}, ${formatDay(transaction.date)}${transaction.note ? `, ${transaction.note}` : ''}${author ? `, ${es.household.byMember(author)}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.icon}>{category?.icon ?? '•'}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.muted} numberOfLines={1}>
          {formatDay(transaction.date)}
          {transaction.note ? ` · ${transaction.note}` : ''}
        </Text>
        {author && <Text style={styles.muted}>{es.household.byMember(author)}</Text>}
      </View>
      <Text
        style={[
          styles.rowAmount,
          { color: transaction.kind === 'income' ? colors.success : colors.text },
        ]}
      >
        {amount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appName: { fontSize: 15, fontWeight: '700', color: colors.muted },
  pushRight: { marginLeft: 'auto' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, color: colors.primary },
  period: { fontSize: 22, fontWeight: '700', color: colors.text },
  summary: { flexDirection: 'row', gap: spacing.sm },
  total: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  totalValue: { fontSize: 17, fontWeight: '600' },
  strong: { fontWeight: '800' },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emptyText: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 56,
  },
  icon: { fontSize: 24, width: 32, textAlign: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '500' },
  rowAmount: { fontSize: 16, fontWeight: '600' },
  upcoming: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  sectionAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  link: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  sectionNote: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  overdueRow: { backgroundColor: '#FDECEA' },
  fab: { position: 'absolute', right: spacing.md, bottom: spacing.lg, minWidth: 160 },
});
