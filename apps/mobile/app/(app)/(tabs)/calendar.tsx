import type {
  CalendarItem,
  CalendarResponse,
  CalendarSavings,
  Category,
  RecurringRule,
} from '@smartnomic/api';
import { monthOf, monthRange, shiftMonth, type DateString } from '@smartnomic/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/http';
import { Button } from '../../../src/components/Button';
import { MonthSlide } from '../../../src/components/MonthSlide';
import { Screen } from '../../../src/components/Screen';
import { Message } from '../../../src/components/Message';
import { MonthGrid } from '../../../src/components/MonthGrid';
import {
  Amount,
  AppText,
  CategoryIcon,
  EmptyState,
  ListRow,
  Section,
  StatusText,
  type StatusKind,
} from '../../../src/design';
import { formatDay, formatMoney, formatMonthTitle } from '../../../src/format';
import {
  todayIn,
  useCalendar,
  useCan,
  useCategories,
  useSavings,
  useMe,
  useMembers,
  useRecurring,
} from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { color, spacing } from '../../../src/design/tokens';

/** Calendario de pagos programados (especificación 002, historias 1 y 2). */
export default function Calendar() {
  const me = useMe();
  const household = me.data?.household;
  const current = household ? monthOf(todayIn(household.timezone)) : undefined;
  const [month, setMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<DateString | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const visible = month ?? current;
  const calendar = useCalendar(household?.id, visible);
  const rules = useRecurring(household?.id);
  const categories = useCategories(household?.id);
  const members = useMembers(household?.id);
  const can = useCan();
  const canResolve = can('occurrences.resolve');
  const canSave = can('savings.write');
  const savings = useSavings(household?.id);

  if (!household || !visible) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </SafeAreaView>
    );
  }

  const data = calendar.data;
  // Mientras llega el mes nuevo se ve el anterior (keepPreviousData): solo vale si coincide.
  const shown = data?.month === visible ? data : undefined;
  const bounds = data?.bounds;
  const go = (next: string) => {
    setMonth(next);
    setSelected(null);
  };
  const day = selected ?? (shown ? defaultDay(shown) : null);
  const offline = calendar.error instanceof ApiError && calendar.error.code === 'network';

  const ruleById = new Map((rules.data?.rules ?? []).map((r) => [r.id, r]));
  const categoryById = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));
  const memberName = new Map((members.data?.members ?? []).map((m) => [m.id, m.name]));
  const dayItems = shown && day ? shown.items.filter((i) => i.dueDate === day) : [];
  const daySavings = shown && day ? shown.savings.filter((s) => s.dueDate === day) : [];
  const goalById = new Map((savings.data?.goals ?? []).map((g) => [g.id, g]));
  const hasAny = shown ? shown.items.length + shown.savings.length > 0 : false;

  return (
    <Screen
      title={formatMonthTitle(visible)}
      prev={{
        label: es.calendar.previous,
        disabled: !bounds || visible <= bounds.min,
        onPress: () => {
          setDirection(-1);
          go(shiftMonth(visible, -1));
        },
      }}
      next={{
        label: es.calendar.next,
        disabled: !bounds || visible >= bounds.max,
        onPress: () => {
          setDirection(1);
          go(shiftMonth(visible, 1));
        },
      }}
      bleed
      fab={can('transactions.write')}
      refreshControl={
        <RefreshControl
          refreshing={calendar.isRefetching}
          onRefresh={() => {
            void calendar.refetch();
            void rules.refetch();
          }}
        />
      }
    >
      {visible !== current && current && (
        <View style={styles.today}>
          <Button variant="link" label={es.calendar.today} onPress={() => go(current)} />
        </View>
      )}

      {(offline || (calendar.error && !shown)) && (
        <View style={styles.notices}>
          {offline && <Message text={es.month.offline} />}
          {calendar.error && !offline && !shown && <Message text={calendar.error.message} />}
        </View>
      )}

      <MonthSlide month={visible} direction={direction}>
        <Section separated padded>
          <View style={styles.totals}>
            <Total label={es.calendar.expenses} cents={shown?.totals.expenseCents} />
            <Total label={es.calendar.income} cents={shown?.totals.incomeCents} />
            <Total
              label={es.calendar.pending}
              cents={shown?.totals.pendingExpenseCents}
              danger={Boolean(shown && shown.totals.pendingExpenseCents > 0)}
            />
          </View>
        </Section>

        <Section separated>
          {shown ? (
            <View style={styles.grid}>
              <MonthGrid
                month={visible}
                items={[...shown.items, ...shown.savings]}
                today={shown.today}
                selected={day}
                onSelect={setSelected}
              />
            </View>
          ) : (
            <ActivityIndicator accessibilityLabel={es.common.loading} />
          )}
        </Section>

        {shown && !hasAny && (
          <EmptyState icon="calendar" title={es.calendar.empty} hint={es.calendar.emptyHint} />
        )}

        {shown && day && hasAny && (
          <Section title={capitalize(formatDay(day))}>
            {dayItems.length + daySavings.length === 0 && (
              <AppText variant="caption" tone="muted" style={styles.none}>
                {es.calendar.noneThatDay}
              </AppText>
            )}
            {dayItems.map((item) => (
              <ItemRow
                key={`${item.ruleId}-${item.dueDate}`}
                item={item}
                rule={ruleById.get(item.ruleId)}
                categories={categoryById}
                resolvedBy={item.resolvedBy ? memberName.get(item.resolvedBy) : undefined}
                onPress={
                  canResolve && (item.status === 'pending' || item.status === 'overdue')
                    ? () => router.push(`/occurrence/${item.ruleId}/${item.dueDate}`)
                    : undefined
                }
              />
            ))}
            {daySavings.map((item) => (
              <SavingsRow
                key={`${item.goalId}-${item.dueDate}`}
                item={item}
                name={goalById.get(item.goalId)?.name ?? '—'}
                icon={goalById.get(item.goalId)?.icon}
                onPress={
                  canSave && (item.status === 'pending' || item.status === 'overdue')
                    ? () => router.push(`/savings/${item.goalId}/due/${item.dueDate}`)
                    : undefined
                }
              />
            ))}
          </Section>
        )}
      </MonthSlide>
    </Screen>
  );
}

/** Día que se enseña al abrir un mes: hoy, o el primero con pagos, o el día 1. */
function defaultDay(data: CalendarResponse): DateString {
  const { start, end } = monthRange(data.month);
  if (data.today >= start && data.today <= end) return data.today;
  return data.items[0]?.dueDate ?? data.savings[0]?.dueDate ?? start;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Total({
  label,
  cents,
  danger,
}: {
  label: string;
  cents: number | undefined;
  danger?: boolean;
}) {
  return (
    <View style={styles.total}>
      <AppText variant="body" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular tone={danger ? 'danger' : 'primary'}>
        {cents === undefined ? '—' : formatMoney(cents)}
      </AppText>
    </View>
  );
}

const PILL: Record<CalendarItem['status'], StatusKind> = {
  overdue: 'overdue',
  pending: 'pending',
  paid: 'paid',
  skipped: 'skipped',
};

function ItemRow({
  item,
  rule,
  categories,
  resolvedBy,
  onPress,
}: {
  item: CalendarItem;
  rule: RecurringRule | undefined;
  categories: Map<string, Category>;
  resolvedBy: string | undefined;
  /** Pagar u omitir (historia 2); solo editores y propietario, y si está sin resolver. */
  onPress: (() => void) | undefined;
}) {
  const category = rule ? categories.get(rule.categoryId) : undefined;
  const status =
    item.status === 'paid' && item.kind === 'income'
      ? es.calendar.collected
      : es.calendar.status[item.status];
  const detail = resolvedBy ? `${status} ${es.calendar.resolvedBy(resolvedBy)}` : status;
  return (
    <ListRow
      title={rule?.name ?? '—'}
      detail={<StatusText kind={PILL[item.status]} label={detail} />}
      leading={<CategoryIcon icon={category?.icon} tone={category?.color} />}
      trailing={
        <Amount
          cents={item.amountCents}
          muted={item.status === 'skipped'}
          strike={item.status === 'skipped'}
        />
      }
      strike={item.status === 'skipped'}
      onPress={onPress}
      accessibilityLabel={`${rule?.name ?? '—'}, ${formatMoney(item.amountCents)}, ${detail}`}
      accessibilityHint={onPress ? es.calendar.resolveHint : undefined}
    />
  );
}

const SAVINGS_PILL: Record<CalendarSavings['status'], StatusKind> = {
  overdue: 'overdue',
  pending: 'pending',
  saved: 'paid',
  skipped: 'skipped',
};

/** Aportación a una hucha en el día elegido (especificación 005, RF-503). */
function SavingsRow({
  item,
  name,
  icon,
  onPress,
}: {
  item: CalendarSavings;
  name: string;
  icon: string | undefined;
  onPress: (() => void) | undefined;
}) {
  const title = es.savings.setAsideFor(name);
  const status = es.savings.calendarStatus[item.status];
  return (
    <ListRow
      title={title}
      detail={<StatusText kind={SAVINGS_PILL[item.status]} label={status} />}
      leading={<CategoryIcon icon={icon} tone={color.text.muted} />}
      trailing={
        <Amount
          cents={item.amountCents}
          muted={item.status === 'skipped'}
          strike={item.status === 'skipped'}
        />
      }
      strike={item.status === 'skipped'}
      onPress={onPress}
      accessibilityLabel={`${title}, ${formatMoney(item.amountCents)}, ${status}`}
      accessibilityHint={onPress ? es.savings.resolveHint : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', backgroundColor: color.bg.canvas },
  today: { alignItems: 'flex-end', paddingHorizontal: spacing.sm },
  notices: { padding: spacing.md, paddingBottom: 0, gap: spacing.ms },
  totals: { gap: spacing.xs },
  total: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  grid: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  none: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
