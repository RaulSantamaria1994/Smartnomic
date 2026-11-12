import type {
  Category,
  PeriodBudget,
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
  isValidDate,
  limitRows,
  MONTH_BUDGET_ROWS,
  MONTH_UPCOMING_ROWS,
  sortBudgets,
  budgetsWithPending,
  pendingInPeriod,
  summaryWithPending,
  periodOf,
  shiftPeriod,
  type DateString,
} from '@smartnomic/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/http';
import { Button } from '../../../src/components/Button';
import { AnimatedList } from '../../../src/components/AnimatedList';
import { MonthSlide } from '../../../src/components/MonthSlide';
import { Screen } from '../../../src/components/Screen';
import { TransactionRow } from '../../../src/components/TransactionRow';
import { OutboxBanner } from '../../../src/components/OutboxBanner';
import type { PendingTransaction } from '../../../src/outbox/outbox';
import { useOutbox } from '../../../src/outbox/useOutbox';
import { Message } from '../../../src/components/Message';
import { ReminderBanners } from '../../../src/components/ReminderBanners';
import {
  Amount,
  AppText,
  BudgetRow,
  CategoryIcon,
  EmptyState,
  Icon,
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
  useMembers,
  usePeriod,
  useRecurring,
  useSavings,
  useUpcoming,
} from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { useHousehold } from '../../../src/households/active';
import { useHouseholdSwitcher } from '../../../src/households/useSwitcher';

/**
 * Movimientos que se pintan de una vez. Con cientos en un periodo, pintarlos todos retrasa
 * también el resumen (CE-003).
 */
const PAGE_SIZE = 100;

/** Una fila de la lista: un movimiento del servidor o uno apuntado sin conexión. */
interface ListItem {
  key: string;
  date: DateString;
  transaction?: Transaction;
  pending?: PendingTransaction;
}

/** Días que faltan para que un vencimiento se destaque como «vence pronto». */
const SOON_DAYS = 3;

/** Pantalla «Mes»: resumen del periodo, próximos pagos y movimientos (especificación 003). */
export default function Month() {
  const { me, household, member } = useHousehold();
  const switcher = useHouseholdSwitcher();
  const [start, setStart] = useState<DateString | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [direction, setDirection] = useState<1 | -1>(1);
  const thisPeriod = household
    ? currentPeriodStart(household.timezone, household.monthStartDay)
    : undefined;
  // Un aviso de actividad abre «Mes» en el mes del movimiento (`?date=…`, especificación 014,
  // RF-1406); `at` cambia en cada toque, para que el mismo aviso otra vez vuelva a ese mes.
  const { date: openDate, at: openedAt } = useLocalSearchParams<{ date?: string; at?: string }>();
  const monthStartDay = household?.monthStartDay;
  useEffect(() => {
    if (!openDate || !isValidDate(openDate) || monthStartDay === undefined) return;
    setDirection(1);
    setStart(periodOf(openDate, monthStartDay).start);
    setShown(PAGE_SIZE);
  }, [openDate, openedAt, monthStartDay]);
  const periodStart = start ?? thisPeriod;
  const period = usePeriod(household?.id, periodStart);
  const categories = useCategories(household?.id);
  const upcoming = useUpcoming(household?.id);
  const rules = useRecurring(household?.id);
  const can = useCan();
  const canWrite = can('transactions.write');
  const outbox = useOutbox();
  const members = useMembers(household?.id);
  const savings = useSavings(household?.id);

  if (me.isPending) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </SafeAreaView>
    );
  }
  if (!household || !member || !periodStart || !me.data) {
    return (
      <SafeAreaView style={styles.center}>
        <Message text={me.error?.message ?? es.auth.errors.unknown} />
        <Button label={es.common.retry} onPress={() => me.refetch()} />
      </SafeAreaView>
    );
  }

  const today = todayIn(household.timezone);
  const current = periodOf(periodStart, household.monthStartDay);
  const move = (n: 1 | -1) => {
    setDirection(n);
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
    members.data && (shared || t.memberId !== member?.id)
      ? (t.memberId && names.get(t.memberId)) || es.household.formerMember
      : null;
  const offline = period.error instanceof ApiError && period.error.code === 'network';
  const serverData = period.data;
  // Lo apuntado sin conexión que cae en este periodo cuenta ya en el resumen, los
  // presupuestos y la lista (especificación 011, RF-1105).
  const pendingHere = serverData
    ? pendingInPeriod(
        outbox.items.filter((p) => p.householdId === household.id),
        serverData.period,
      )
    : [];
  const data = serverData && {
    ...serverData,
    summary: summaryWithPending(serverData.summary, pendingHere),
    budgets: budgetsWithPending(serverData.budgets, pendingHere),
  };
  const visibleTransactions = data ? data.transactions.slice(0, shown) : [];
  // Los pendientes van delante de los movimientos de su mismo día.
  const listItems: ListItem[] = [
    // Entre ellos, el último apuntado primero, como en el resto de la lista.
    ...[...pendingHere]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((p) => ({ key: p.id, pending: p, date: p.input.date })),
    ...visibleTransactions.map((t) => ({ key: t.id, transaction: t, date: t.date })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <Screen
      title={formatPeriod(current, household.monthStartDay)}
      switcher={switcher}
      prev={{ label: es.month.previous, onPress: () => move(-1) }}
      next={{ label: es.month.next, onPress: () => move(1) }}
      action={{ icon: 'search', label: es.search.title, onPress: () => router.push('/search') }}
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
      {(offline || upcoming.data || outbox.items.length > 0) && (
        <View style={styles.notices}>
          {offline && <Message text={es.month.offline} />}
          <OutboxBanner householdId={household.id} />
          <ReminderBanners
            occurrences={upcoming.data?.occurrences}
            today={upcoming.data?.today}
            hasRules={(rules.data?.rules.length ?? 0) > 0}
            remindersEnabled={member.remindersEnabled}
          />
        </View>
      )}

      <MonthSlide month={periodStart} direction={direction}>
        <Section separated>
          <SummaryBlock
            incomeCents={data?.summary.incomeCents}
            expenseCents={data?.summary.expenseCents}
            balanceCents={data?.summary.balanceCents}
            setAsideCents={data?.summary.setAsideCents}
            current={periodStart === thisPeriod}
          />
        </Section>

        <BudgetSection budgets={data?.budgets} categories={byId} canWrite={can('budgets.write')} />

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

          {data && data.transactions.length === 0 && pendingHere.length === 0 && (
            <EmptyState
              icon="tag"
              title={es.month.empty}
              {...(canWrite && { hint: es.month.emptyHint })}
            />
          )}

          {data && (
            <AnimatedList
              // Otro mes es otra lista: entra deslizando entera, sin fundir fila a fila.
              key={periodStart}
              items={listItems}
              keyOf={(item) => item.key}
              render={(item) =>
                item.pending ? (
                  <TransactionRow
                    transaction={{ ...item.pending.input, note: item.pending.input.note ?? null }}
                    when={dayLabel(item.pending.input.date, today)}
                    category={byId.get(item.pending.input.categoryId)}
                    author={null}
                    status={
                      item.pending.status === 'rejected'
                        ? es.outbox.rejected(item.pending.reason ?? es.outbox.rejectedShort)
                        : es.outbox.pending
                    }
                    onPress={() => router.push(`/pending/${item.pending!.id}`)}
                  />
                ) : (
                  <TransactionRow
                    transaction={item.transaction!}
                    when={dayLabel(item.transaction!.date, today)}
                    category={byId.get(item.transaction!.categoryId)}
                    author={authorOf(item.transaction!)}
                    onPress={
                      canWrite
                        ? () => router.push(`/transaction/${item.transaction!.id}`)
                        : undefined
                    }
                  />
                )
              }
            />
          )}
          {data && data.transactions.length > shown && (
            <Button
              variant="link"
              label={es.month.showMore(data.transactions.length - shown)}
              onPress={() => setShown((n) => n + PAGE_SIZE)}
            />
          )}
        </Section>
      </MonthSlide>
    </Screen>
  );
}

/**
 * Presupuestos del periodo (especificación 007, historia 2): de más a menos gastado, los 3
 * primeros y «Ver todos» si hay más (especificación 015). Sin ninguno, quien puede ponerlos ve
 * una sola fila para empezar; quien no, nada.
 */
function BudgetSection({
  budgets,
  categories,
  canWrite,
}: {
  budgets: PeriodBudget[] | undefined;
  categories: Map<string, Category>;
  canWrite: boolean;
}) {
  if (!budgets) return null;
  if (budgets.length === 0) {
    if (!canWrite) return null;
    return (
      <ListRow
        title={es.budgets.start}
        detail={es.budgets.startHint}
        onPress={() => router.push('/budgets')}
        accessibilityLabel={es.budgets.start}
        leading={<Icon name="budget" tint={color.text.muted} />}
      />
    );
  }
  const rows = sortBudgets(
    budgets.map((b) => ({ ...b, name: categories.get(b.categoryId)?.name ?? '—' })),
  );
  const { shown, hidden } = limitRows(rows, MONTH_BUDGET_ROWS);
  return (
    <Section title={es.budgets.title} separated>
      {shown.map((b) => {
        const category = categories.get(b.categoryId);
        return (
          <BudgetRow
            key={b.categoryId}
            name={b.name}
            icon={category?.icon}
            tone={category?.color}
            amountCents={b.amountCents}
            spentCents={b.spentCents}
            onPress={canWrite ? () => router.push('/budgets') : undefined}
          />
        );
      })}
      {hidden > 0 ? (
        // Lleva a la misma pantalla que «Editar presupuestos», que ya los lista todos.
        <View style={styles.more}>
          <Button
            variant="link"
            label={es.budgets.seeAll}
            accessibilityLabel={es.budgets.seeAllLabel}
            onPress={() => router.push('/budgets')}
          />
        </View>
      ) : (
        canWrite && (
          <View style={styles.more}>
            <Button
              variant="link"
              label={es.budgets.edit}
              onPress={() => router.push('/budgets')}
            />
          </View>
        )
      )}
    </Section>
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
  // Sin huchas, una sola fila para empezar, sin el título encima (especificación 015).
  if (open.length === 0) {
    return (
      <ListRow
        title={es.savings.startOne}
        detail={es.savings.emptyHint}
        onPress={() => router.push('/savings/new')}
        accessibilityLabel={es.savings.startOne}
        leading={<CategoryIcon icon="savings" tone={color.text.muted} />}
      />
    );
  }
  return (
    <Section title={es.savings.title} separated>
      {open.slice(0, 3).map((goal) => (
        <SavingsRow key={goal.id} goal={goal} onPress={() => router.push(`/savings/${goal.id}`)} />
      ))}
      <View style={styles.more}>
        <Button variant="link" label={es.savings.seeAll} onPress={() => router.push('/savings')} />
      </View>
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
  // Sin ninguna regla, una sola fila (sin acción, como el estado vacío de antes).
  if (rules.length === 0 && entries.length === 0) {
    return (
      <ListRow
        title={es.recurring.upcomingTitle}
        detail={
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {es.recurring.empty}
          </AppText>
        }
        leading={<Icon name="recurring" tint={color.text.muted} />}
        accessibilityLabel={`${es.recurring.upcomingTitle}. ${es.recurring.empty}`}
      />
    );
  }
  // Los atrasados no se esconden nunca (especificación 015, RF-1503).
  const { shown, hidden } = limitRows(entries, MONTH_UPCOMING_ROWS, (e) => e.overdue);
  return (
    <Section title={es.recurring.upcomingTitle} separated={entries.length === 0 || hidden > 0}>
      {entries.length === 0 && (
        <AppText variant="caption" tone="muted" style={styles.none}>
          {es.recurring.noUpcoming}
        </AppText>
      )}
      {shown.map((entry) => (
        <UpcomingRow key={entry.key} entry={entry} today={today} />
      ))}
      {hidden > 0 && (
        <View style={styles.more}>
          <Button
            variant="link"
            label={es.recurring.seeAll}
            accessibilityLabel={es.recurring.seeAllLabel}
            // La pestaña «Pagos»: `navigate` evita apilarla sobre «Mes».
            onPress={() => router.navigate('/recurring')}
          />
        </View>
      )}
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
