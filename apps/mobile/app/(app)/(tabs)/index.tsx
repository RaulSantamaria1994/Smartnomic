import type {
  Category,
  RecurringRule,
  SavingsGoalDto,
  Transaction,
  UpcomingOccurrenceDto,
  UpcomingSavings,
} from '@smartnomic/api';
import {
  addDays,
  compareDates,
  daysBetween,
  periodOf,
  shiftPeriod,
  type DateString,
} from '@smartnomic/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/http';
import { Button } from '../../../src/components/Button';
import { Screen } from '../../../src/components/Screen';
import { Message } from '../../../src/components/Message';
import { ReminderBanners } from '../../../src/components/ReminderBanners';
import {
  Amount,
  AppText,
  CategoryIcon,
  EmptyState,
  ListRow,
  SavingsRow,
  Section,
  SummaryBlock,
  type StatusKind,
} from '../../../src/design';
import { color, spacing } from '../../../src/design/tokens';
import {
  formatDay,
  formatMoney,
  formatDayMonth,
  formatPeriod,
  formatRelativeDue,
} from '../../../src/format';
import {
  currentPeriodStart,
  todayIn,
  useCan,
  useCategories,
  useMe,
  useMembers,
  usePeriod,
  useRecurring,
  useSavings,
  useUpcoming,
} from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';

/**
 * Movimientos que se pintan de una vez. Con cientos en un periodo, pintarlos todos retrasa
 * también el resumen (CE-003).
 */
const PAGE_SIZE = 100;

/** Días que faltan para que un vencimiento se destaque como «vence pronto». */
const SOON_DAYS = 3;

/** Pantalla «Mes»: resumen del periodo, próximos pagos y movimientos (especificación 003). */
export default function Month() {
  const me = useMe();
  const household = me.data?.household;
  const [start, setStart] = useState<DateString | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const thisPeriod = household
    ? currentPeriodStart(household.timezone, household.monthStartDay)
    : undefined;
  const periodStart = start ?? thisPeriod;
  const period = usePeriod(household?.id, periodStart);
  const categories = useCategories(household?.id);
  const upcoming = useUpcoming(household?.id);
  const rules = useRecurring(household?.id);
  const can = useCan();
  const canWrite = can('transactions.write');
  const members = useMembers(household?.id);
  const savings = useSavings(household?.id);

  if (me.isPending) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </SafeAreaView>
    );
  }
  if (!household || !periodStart || !me.data) {
    return (
      <SafeAreaView style={styles.center}>
        <Message text={me.error?.message ?? es.auth.errors.unknown} />
        <Button label={es.common.retry} onPress={() => me.refetch()} />
      </SafeAreaView>
    );
  }

  const today = todayIn(household.timezone);
  const current = periodOf(periodStart, household.monthStartDay);
  const move = (n: number) => {
    setStart(shiftPeriod(current, n, household.monthStartDay).start);
    setShown(PAGE_SIZE);
  };
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
    <Screen
      title={formatPeriod(current, household.monthStartDay)}
      subtitle={household.name}
      prev={{ label: es.month.previous, onPress: () => move(-1) }}
      next={{ label: es.month.next, onPress: () => move(1) }}
      bleed
      fab={canWrite}
      refreshControl={
        <RefreshControl
          refreshing={period.isRefetching}
          onRefresh={() => {
            void period.refetch();
            void categories.refetch();
            void upcoming.refetch();
            void rules.refetch();
            void members.refetch();
            void savings.refetch();
          }}
        />
      }
    >
      {(offline || upcoming.data) && (
        <View style={styles.notices}>
          {offline && <Message text={es.month.offline} />}
          <ReminderBanners
            occurrences={upcoming.data?.occurrences}
            today={upcoming.data?.today}
            hasRules={(rules.data?.rules.length ?? 0) > 0}
            remindersEnabled={me.data.member.remindersEnabled}
          />
        </View>
      )}

      <Section separated>
        <SummaryBlock
          incomeCents={data?.summary.incomeCents}
          expenseCents={data?.summary.expenseCents}
          balanceCents={data?.summary.balanceCents}
          setAsideCents={data?.summary.setAsideCents}
          current={periodStart === thisPeriod}
        />
      </Section>

      <Upcoming
        items={upcoming.data?.occurrences}
        savings={upcoming.data?.savings}
        goals={savings.data?.goals}
        canSave={can('savings.write')}
        today={upcoming.data?.today}
        rules={rules.data?.rules}
        categories={byId}
        canResolve={can('occurrences.resolve')}
      />

      <SavingsSection goals={savings.data?.goals} canWrite={can('savings.write')} />

      <Section title={es.home.transactions}>
        {period.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
        {period.error && !offline && !data && (
          <View style={styles.notices}>
            <Message text={period.error.message} />
          </View>
        )}

        {data && data.transactions.length === 0 && (
          <EmptyState
            icon="tag"
            title={es.month.empty}
            {...(canWrite && { hint: es.month.emptyHint })}
          />
        )}

        {data &&
          data.transactions
            .slice(0, shown)
            .map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                today={today}
                category={byId.get(t.categoryId)}
                author={authorOf(t)}
                onPress={canWrite ? () => router.push(`/transaction/${t.id}`) : undefined}
              />
            ))}
        {data && data.transactions.length > shown && (
          <Button
            variant="link"
            label={es.month.showMore(data.transactions.length - shown)}
            onPress={() => setShown((n) => n + PAGE_SIZE)}
          />
        )}
      </Section>
    </Screen>
  );
}

/** Huchas en curso o conseguidas (especificación 005); las cerradas, solo en su pantalla. */
function SavingsSection({
  goals,
  canWrite,
}: {
  goals: SavingsGoalDto[] | undefined;
  canWrite: boolean;
}) {
  if (!goals) return null;
  const open = goals.filter((g) => g.plan.status !== 'closed');
  if (open.length === 0 && !canWrite) return null;
  return (
    <Section title={es.savings.title} separated>
      {open.length === 0 ? (
        <ListRow
          title={es.savings.startOne}
          detail={es.savings.emptyHint}
          onPress={() => router.push('/savings/new')}
          accessibilityLabel={es.savings.startOne}
          leading={<CategoryIcon icon="savings" tone={color.text.muted} />}
        />
      ) : (
        <>
          {open.slice(0, 3).map((goal) => (
            <SavingsRow
              key={goal.id}
              goal={goal}
              onPress={() => router.push(`/savings/${goal.id}`)}
            />
          ))}
          <View style={styles.more}>
            <Button
              variant="link"
              label={es.savings.seeAll}
              onPress={() => router.push('/savings')}
            />
          </View>
        </>
      )}
    </Section>
  );
}

/** Una fila de «Próximos pagos»: un vencimiento o una aportación a una hucha. */
interface UpcomingEntry {
  key: string;
  dueDate: DateString;
  overdue: boolean;
  name: string;
  amountCents: number;
  income: boolean;
  icon: string | undefined;
  tone: string | undefined;
  onPress: (() => void) | undefined;
}

/**
 * «Próximos pagos»: atrasados y de los próximos 30 días (RF-023), en una lista, junto con
 * las aportaciones pendientes de las huchas (especificación 005, RF-503).
 */
function Upcoming({
  items,
  savings,
  goals,
  today,
  rules,
  categories,
  canResolve,
  canSave,
}: {
  items: UpcomingOccurrenceDto[] | undefined;
  savings: UpcomingSavings[] | undefined;
  goals: SavingsGoalDto[] | undefined;
  today: string | undefined;
  rules: RecurringRule[] | undefined;
  categories: Map<string, Category>;
  canResolve: boolean;
  canSave: boolean;
}) {
  if (!items || !today || !rules) return null;
  const byId = new Map(rules.map((r) => [r.id, r]));
  const goalById = new Map((goals ?? []).map((g) => [g.id, g]));
  const entries: UpcomingEntry[] = [
    ...items.flatMap((item) => {
      const rule = byId.get(item.ruleId);
      if (!rule) return [];
      const category = categories.get(rule.categoryId);
      return [
        {
          key: `${item.ruleId}-${item.dueDate}`,
          dueDate: item.dueDate,
          overdue: item.overdue,
          name: rule.name,
          amountCents: rule.amountCents,
          income: rule.kind === 'income',
          icon: category?.icon,
          tone: category?.color,
          onPress: canResolve
            ? () => router.push(`/occurrence/${item.ruleId}/${item.dueDate}`)
            : undefined,
        },
      ];
    }),
    ...(savings ?? []).flatMap((item) => {
      const goal = goalById.get(item.goalId);
      if (!goal) return [];
      return [
        {
          key: `${item.goalId}-${item.dueDate}`,
          dueDate: item.dueDate,
          overdue: item.overdue,
          name: es.savings.setAsideFor(goal.name),
          amountCents: item.quotaCents,
          income: false,
          icon: goal.icon,
          tone: color.text.muted,
          onPress: canSave
            ? () => router.push(`/savings/${item.goalId}/due/${item.dueDate}`)
            : undefined,
        },
      ];
    }),
  ].sort((a, b) => compareDates(a.dueDate, b.dueDate));
  return (
    <Section title={es.recurring.upcomingTitle} separated={entries.length === 0}>
      {rules.length === 0 && entries.length === 0 && (
        <EmptyState icon="recurring" title={es.recurring.empty} />
      )}
      {rules.length > 0 && entries.length === 0 && (
        <AppText variant="caption" tone="muted" style={styles.none}>
          {es.recurring.noUpcoming}
        </AppText>
      )}
      {entries.map((entry) => (
        <UpcomingRow key={entry.key} entry={entry} today={today} />
      ))}
    </Section>
  );
}

function UpcomingRow({ entry, today }: { entry: UpcomingEntry; today: string }) {
  const soon = !entry.overdue && compareDates(entry.dueDate, addDays(today, SOON_DAYS)) <= 0;
  const kind: StatusKind = entry.overdue ? 'overdue' : soon ? 'soon' : 'pending';
  const when = formatRelativeDue(entry.dueDate, today);
  const date = formatDayMonth(entry.dueDate);
  const status = entry.overdue ? es.recurring.overdue : when;
  return (
    <ListRow
      title={entry.name}
      detail={
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {status === date ? '' : `${date} · `}
          <AppText variant="caption" style={{ color: color.status[kind] }}>
            {status}
          </AppText>
        </AppText>
      }
      leading={<CategoryIcon icon={entry.icon} tone={entry.tone} />}
      trailing={<Amount cents={entry.amountCents} kind={entry.income ? 'income' : undefined} />}
      onPress={entry.onPress}
      accessibilityLabel={`${entry.name}, ${formatMoney(entry.amountCents)}, ${when}${entry.overdue ? `, ${es.recurring.overdue}` : ''}`}
    />
  );
}

/** «Hoy», «Ayer» o «martes, 27 de octubre». */
function dayLabel(date: DateString, today: DateString): string {
  const days = daysBetween(today, date);
  if (days === 0) return es.recurring.today;
  if (days === -1) return es.recurring.yesterday;
  return formatDay(date);
}

function TransactionRow({
  transaction,
  today,
  category,
  author,
  onPress,
}: {
  transaction: Transaction;
  today: DateString;
  category: Category | undefined;
  author: string | null;
  onPress: (() => void) | undefined;
}) {
  const name = category?.name ?? '—';
  const detail = [
    dayLabel(transaction.date, today),
    transaction.note,
    author && es.household.byMember(author),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      title={name}
      detail={detail}
      leading={<CategoryIcon icon={category?.icon} tone={category?.color} />}
      trailing={<Amount cents={transaction.amountCents} kind={transaction.kind} />}
      onPress={onPress}
      accessibilityLabel={`${name}, ${formatMoney(transaction.amountCents)}, ${detail}`}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: color.bg.canvas,
  },
  notices: { padding: spacing.md, paddingBottom: 0, gap: spacing.ms },
  none: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  more: { alignItems: 'flex-start', paddingLeft: spacing.xl + spacing.md },
});
