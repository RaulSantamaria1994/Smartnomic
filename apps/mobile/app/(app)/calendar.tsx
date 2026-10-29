import type { CalendarItem, CalendarResponse, Category, RecurringRule } from '@smartnomic/api';
import { monthOf, monthRange, shiftMonth, type DateString } from '@smartnomic/domain';
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
import { MonthGrid } from '../../src/components/MonthGrid';
import { formatDay, formatMoney, formatMonthTitle } from '../../src/format';
import {
  todayIn,
  useCalendar,
  useCategories,
  useMe,
  useMembers,
  useRecurring,
} from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { colors, spacing } from '../../src/theme';

/** Calendario de pagos programados (especificación 002, historia 1). */
export default function Calendar() {
  const me = useMe();
  const household = me.data?.household;
  const current = household ? monthOf(todayIn(household.timezone)) : undefined;
  const [month, setMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<DateString | null>(null);
  const visible = month ?? current;
  const calendar = useCalendar(household?.id, visible);
  const rules = useRecurring(household?.id);
  const categories = useCategories(household?.id);
  const members = useMembers(household?.id);

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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
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
        <View style={styles.topBar}>
          <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
          {visible !== current && current && (
            <Button variant="link" label={es.calendar.today} onPress={() => go(current)} />
          )}
        </View>
        <View style={styles.header}>
          <Arrow
            label={es.calendar.previous}
            symbol="‹"
            disabled={!bounds || visible <= bounds.min}
            onPress={() => go(shiftMonth(visible, -1))}
          />
          <Text style={styles.title} accessibilityRole="header">
            {formatMonthTitle(visible)}
          </Text>
          <Arrow
            label={es.calendar.next}
            symbol="›"
            disabled={!bounds || visible >= bounds.max}
            onPress={() => go(shiftMonth(visible, 1))}
          />
        </View>

        {offline && <Message text={es.month.offline} />}
        {calendar.error && !offline && !shown && <Message text={calendar.error.message} />}

        <View style={styles.totals}>
          <Total label={es.calendar.expenses} cents={shown?.totals.expenseCents} />
          <Total label={es.calendar.income} cents={shown?.totals.incomeCents} />
          <Total
            label={es.calendar.pending}
            cents={shown?.totals.pendingExpenseCents}
            color={shown && shown.totals.pendingExpenseCents > 0 ? colors.error : colors.text}
          />
        </View>

        {shown ? (
          <MonthGrid
            month={visible}
            items={shown.items}
            today={shown.today}
            selected={day}
            onSelect={setSelected}
          />
        ) : (
          <ActivityIndicator accessibilityLabel={es.common.loading} />
        )}

        {shown && shown.items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{es.calendar.empty}</Text>
            <Text style={styles.muted}>{es.calendar.emptyHint}</Text>
          </View>
        )}

        {shown && day && shown.items.length > 0 && (
          <View style={styles.list}>
            <Text style={styles.listTitle} accessibilityRole="header">
              {capitalize(formatDay(day))}
            </Text>
            {dayItems.length === 0 && (
              <Text style={[styles.muted, styles.listNote]}>{es.calendar.noneThatDay}</Text>
            )}
            {dayItems.map((item) => (
              <ItemRow
                key={`${item.ruleId}-${item.dueDate}`}
                item={item}
                rule={ruleById.get(item.ruleId)}
                categories={categoryById}
                resolvedBy={item.resolvedBy ? memberName.get(item.resolvedBy) : undefined}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Día que se enseña al abrir un mes: hoy, o el primero con pagos, o el día 1. */
function defaultDay(data: CalendarResponse): DateString {
  const { start, end } = monthRange(data.month);
  if (data.today >= start && data.today <= end) return data.today;
  return data.items[0]?.dueDate ?? start;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Arrow({
  label,
  symbol,
  disabled,
  onPress,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.arrow, (pressed || disabled) && { opacity: 0.3 }]}
    >
      <Text style={styles.arrowText}>{symbol}</Text>
    </Pressable>
  );
}

function Total({
  label,
  cents,
  color = colors.text,
}: {
  label: string;
  cents: number | undefined;
  color?: string;
}) {
  return (
    <View style={styles.total}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.totalValue, { color }]}>
        {cents === undefined ? '—' : formatMoney(cents)}
      </Text>
    </View>
  );
}

function ItemRow({
  item,
  rule,
  categories,
  resolvedBy,
}: {
  item: CalendarItem;
  rule: RecurringRule | undefined;
  categories: Map<string, Category>;
  resolvedBy: string | undefined;
}) {
  const category = rule ? categories.get(rule.categoryId) : undefined;
  const status =
    item.status === 'paid' && item.kind === 'income'
      ? es.calendar.collected
      : es.calendar.status[item.status];
  const detail = resolvedBy ? `${status} ${es.calendar.resolvedBy(resolvedBy)}` : status;
  const statusColor =
    item.status === 'overdue'
      ? colors.error
      : item.status === 'paid'
        ? colors.success
        : colors.muted;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${rule?.name ?? '—'}, ${formatMoney(item.amountCents)}, ${detail}`}
    >
      <Text style={styles.icon}>{category?.icon ?? '•'}</Text>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, item.status === 'skipped' && styles.skipped]}>
          {rule?.name ?? '—'}
        </Text>
        <Text style={[styles.muted, { color: statusColor }]}>{detail}</Text>
      </View>
      <Text
        style={[
          styles.rowAmount,
          { color: item.kind === 'income' ? colors.success : colors.text },
          item.status === 'skipped' && styles.skipped,
        ]}
      >
        {formatMoney(item.amountCents)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, color: colors.primary },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  totals: { flexDirection: 'row', gap: spacing.sm },
  total: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  totalValue: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 14, color: colors.muted },
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  emptyText: { fontSize: 16, color: colors.text, textAlign: 'center' },
  list: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.sm,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  listNote: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 56,
  },
  icon: { fontSize: 24, width: 32, textAlign: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, color: colors.text, fontWeight: '500' },
  rowAmount: { fontSize: 16, fontWeight: '600' },
  skipped: { textDecorationLine: 'line-through', color: colors.muted },
});
