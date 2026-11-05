import type { Category, ChartsResponse, SavingsGoalDto } from '@smartnomic/api';
import {
  barShare,
  defaultCategory,
  periodOf,
  shares,
  shiftPeriod,
  sortByAmount,
  type DateString,
} from '@smartnomic/domain';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/http';
import { Button } from '../../../src/components/Button';
import { Chip } from '../../../src/components/Chip';
import { Message } from '../../../src/components/Message';
import { MonthSlide } from '../../../src/components/MonthSlide';
import { Screen } from '../../../src/components/Screen';
import { Amount, AppText, CategoryIcon, ChartRow, EmptyState, Section } from '../../../src/design';
import { color, spacing } from '../../../src/design/tokens';
import { formatMoney, formatPeriod, formatSignedMoney } from '../../../src/format';
import {
  currentPeriodStart,
  useCan,
  useCategories,
  useCharts,
  useMe,
  useSavings,
} from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';

type ChartKind = 'category' | 'flow' | 'trend' | 'savings';

const CHARTS: { kind: ChartKind; label: string }[] = [
  { kind: 'category', label: es.charts.kinds.category },
  { kind: 'flow', label: es.charts.kinds.flow },
  { kind: 'trend', label: es.charts.kinds.trend },
  { kind: 'savings', label: es.charts.kinds.savings },
];

/**
 * Pestaña «Gráficas» (especificación 008): una gráfica cada vez, elegida con los chips de
 * arriba, para el mes que se elige con las flechas (las de evolución terminan en él).
 */
export default function Charts() {
  const me = useMe();
  const household = me.data?.household;
  const [start, setStart] = useState<DateString | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [kind, setKind] = useState<ChartKind>('category');
  // Categoría de «Evolución»; sin elegir, la de más gasto del mes (`defaultCategory`).
  const [trendCategory, setTrendCategory] = useState<string | null>(null);
  const periodStart =
    start ??
    (household ? currentPeriodStart(household.timezone, household.monthStartDay) : undefined);
  const charts = useCharts(household?.id, periodStart);
  const categories = useCategories(household?.id);
  const savings = useSavings(household?.id);
  const can = useCan();

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
  const move = (n: 1 | -1) => {
    setDirection(n);
    setStart(shiftPeriod(current, n, household.monthStartDay).start);
  };
  const offline = charts.error instanceof ApiError && charts.error.code === 'network';
  const byId = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));

  return (
    <Screen
      title={formatPeriod(current, household.monthStartDay)}
      subtitle={es.charts.title}
      prev={{ label: es.month.previous, onPress: () => move(-1) }}
      next={{ label: es.month.next, onPress: () => move(1) }}
      bleed
      fab={can('transactions.write')}
      refreshControl={
        <RefreshControl
          refreshing={charts.isRefetching}
          onRefresh={() => {
            void charts.refetch();
            void categories.refetch();
            void savings.refetch();
          }}
        />
      }
    >
      <View
        style={styles.chooser}
        accessibilityRole="radiogroup"
        accessibilityLabel={es.charts.chooser}
      >
        {CHARTS.map((chart) => (
          <Chip
            key={chart.kind}
            label={chart.label}
            selected={kind === chart.kind}
            onPress={() => {
              if (chart.kind === 'trend') setTrendCategory(null);
              setKind(chart.kind);
            }}
          />
        ))}
      </View>
      {offline && (
        <View style={styles.notice}>
          <Message text={es.month.offline} />
        </View>
      )}
      <MonthSlide month={periodStart} direction={direction}>
        {charts.data ? (
          <>
            {kind === 'category' && (
              <CategoryChart
                data={charts.data}
                byId={byId}
                onOpen={(id) => {
                  setTrendCategory(id);
                  setKind('trend');
                }}
              />
            )}
            {kind === 'trend' && (
              <TrendChart
                data={charts.data}
                categories={categories.data?.categories ?? []}
                selected={trendCategory}
                onSelect={setTrendCategory}
                monthStartDay={household.monthStartDay}
              />
            )}
            {kind === 'savings' && (
              <SavingsChart
                data={charts.data}
                goals={savings.data?.goals}
                canCreate={can('savings.write')}
                monthStartDay={household.monthStartDay}
              />
            )}
            {kind === 'flow' && (
              <FlowChart data={charts.data} monthStartDay={household.monthStartDay} />
            )}
          </>
        ) : charts.isPending ? (
          <View style={styles.loading}>
            <ActivityIndicator accessibilityLabel={es.common.loading} />
          </View>
        ) : (
          <View style={styles.notice}>
            <Message text={es.charts.error} />
            <Button label={es.common.retry} onPress={() => charts.refetch()} />
          </View>
        )}
      </MonthSlide>
    </Screen>
  );
}

/** «Por categoría»: en qué se va el dinero del mes elegido (historia 1). */
function CategoryChart({
  data,
  byId,
  onOpen,
}: {
  data: ChartsResponse;
  byId: Map<string, Category>;
  /** Abre la evolución de la categoría tocada (RF-806). */
  onOpen: (categoryId: string) => void;
}) {
  const last = data.months.length - 1;
  const rows = sortByAmount(
    data.categories
      .map((c) => ({
        id: c.categoryId,
        category: byId.get(c.categoryId),
        name: byId.get(c.categoryId)?.name ?? es.charts.unknownCategory,
        amountCents: c.monthsCents[last] ?? 0,
      }))
      .filter((row) => row.amountCents > 0),
  );
  if (rows.length === 0) {
    return <EmptyState icon="chart" title={es.charts.noExpenses} hint={es.charts.noExpensesHint} />;
  }
  const percents = shares(rows.map((row) => row.amountCents));
  const max = rows[0]!.amountCents;
  return (
    <>
      <Section separated padded>
        <View style={styles.total}>
          <AppText variant="caption" tone="muted">
            {es.charts.totalSpent}
          </AppText>
          <Amount cents={data.months[last]!.expenseCents} variant="amountLarge" />
        </View>
      </Section>
      {rows.map((row, index) => {
        const amount = formatMoney(row.amountCents);
        const percent = es.charts.percent(percents[index]!);
        return (
          <ChartRow
            key={row.id}
            label={row.name}
            value={amount}
            detail={percent}
            leading={<CategoryIcon icon={row.category?.icon} tone={row.category?.color} />}
            bars={[{ share: barShare(row.amountCents, max) }]}
            accessibilityLabel={es.charts.categoryRow(row.name, amount, percent)}
            accessibilityHint={es.charts.trendHint}
            onPress={() => onOpen(row.id)}
          />
        );
      })}
    </>
  );
}

/** «Evolución»: lo gastado en una categoría en cada uno de los 6 meses (historia 3). */
function TrendChart({
  data,
  categories,
  selected,
  onSelect,
  monthStartDay,
}: {
  data: ChartsResponse;
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string) => void;
  monthStartDay: number;
}) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const last = data.months.length - 1;
  const choices = categories
    .filter((c) => c.kind === 'expense' && !c.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const id =
    selected ??
    defaultCategory(
      categories,
      data.categories.map((c) => ({
        categoryId: c.categoryId,
        amountCents: c.monthsCents[last] ?? 0,
      })),
    );
  const category = categories.find((c) => c.id === id);
  if (!id || !category) {
    return <EmptyState icon="chart" title={es.charts.noCategories} />;
  }
  const series =
    data.categories.find((c) => c.categoryId === id)?.monthsCents ?? data.months.map(() => 0);
  const max = Math.max(...series);
  return (
    <>
      <AppText variant="caption" tone="muted" style={styles.categoriesLabel}>
        {es.charts.trendChooser}
      </AppText>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        accessibilityRole="radiogroup"
        accessibilityLabel={es.charts.trendChooser}
      >
        {choices.map((c) => (
          <View
            key={c.id}
            onLayout={(event) => {
              // La elegida queda a la vista aunque esté al final de la lista.
              if (c.id === id) {
                scroller.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - spacing.md),
                  animated: false,
                });
              }
            }}
          >
            <Chip
              label={c.name}
              selected={c.id === id}
              onPress={() => onSelect(c.id)}
              icon={<CategoryIcon icon={c.icon} tone={c.color} size="sm" />}
            />
          </View>
        ))}
      </ScrollView>
      {data.months.map((month, index) => {
        const name = formatPeriod(month, monthStartDay);
        const amount = formatMoney(series[index] ?? 0);
        return (
          <ChartRow
            key={month.start}
            label={name}
            value={amount}
            bars={[{ share: barShare(series[index] ?? 0, max) }]}
            accessibilityLabel={es.charts.trendRow(name, category.name, amount)}
          />
        );
      })}
    </>
  );
}

/** «Huchas»: lo apartado al final de cada mes y lo que lleva cada hucha (historia 4). */
function SavingsChart({
  data,
  goals,
  canCreate,
  monthStartDay,
}: {
  data: ChartsResponse;
  goals: SavingsGoalDto[] | undefined;
  canCreate: boolean;
  monthStartDay: number;
}) {
  if (!goals) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </View>
    );
  }
  if (goals.length === 0) {
    return (
      <EmptyState
        icon="savings"
        title={es.savings.empty}
        hint={es.savings.emptyHint}
        {...(canCreate && {
          action: (
            <Button label={es.savings.newTitle} onPress={() => router.push('/savings/new')} />
          ),
        })}
      />
    );
  }
  const byId = new Map(goals.map((g) => [g.id, g]));
  const months = data.savings.monthsCents;
  const maxMonth = Math.max(...months);
  const rows = sortByAmount(
    data.savings.goals.map((g) => ({
      id: g.goalId,
      goal: byId.get(g.goalId),
      name: byId.get(g.goalId)?.name ?? es.savings.title,
      amountCents: g.balanceCents,
    })),
  );
  const maxGoal = rows[0]?.amountCents ?? 0;
  return (
    <>
      <Section title={es.charts.savedByMonth} separated>
        {data.months.map((month, index) => {
          const name = formatPeriod(month, monthStartDay);
          const amount = formatMoney(months[index] ?? 0);
          return (
            <ChartRow
              key={month.start}
              label={name}
              value={amount}
              bars={[{ share: barShare(months[index] ?? 0, maxMonth) }]}
              accessibilityLabel={es.charts.savedRow(name, amount)}
            />
          );
        })}
      </Section>
      <Section title={es.charts.savedByGoal}>
        {rows.length === 0 ? (
          <View style={styles.notice}>
            <AppText variant="body" tone="muted">
              {es.charts.noSaved}
            </AppText>
          </View>
        ) : (
          rows.map((row) => {
            const amount = formatMoney(row.amountCents);
            return (
              <ChartRow
                key={row.id}
                label={row.name}
                value={amount}
                leading={<CategoryIcon icon={row.goal?.icon} tone={color.text.muted} />}
                bars={[{ share: barShare(row.amountCents, maxGoal) }]}
                accessibilityLabel={es.charts.goalRow(row.name, amount)}
              />
            );
          })
        )}
      </Section>
    </>
  );
}

/** Diferencia con signo: «+150,00 €», «−45,00 €» o «0,00 €». */
function signed(cents: number): string {
  if (cents === 0) return formatMoney(0);
  return formatSignedMoney(Math.abs(cents), cents > 0 ? 'income' : 'expense');
}

/** «Ingresos y gastos»: los 6 meses, del más antiguo al más reciente (historia 2). */
function FlowChart({ data, monthStartDay }: { data: ChartsResponse; monthStartDay: number }) {
  // Misma escala para las 12 barras: la mayor de todas.
  const max = Math.max(...data.months.flatMap((m) => [m.incomeCents, m.expenseCents]));
  return (
    <>
      {data.months.map((month) => {
        const name = formatPeriod(month, monthStartDay);
        const income = formatMoney(month.incomeCents);
        const expense = formatMoney(month.expenseCents);
        const difference = signed(month.incomeCents - month.expenseCents);
        return (
          <ChartRow
            key={month.start}
            label={name}
            value={difference}
            bars={[
              {
                share: barShare(month.incomeCents, max),
                tone: 'income',
                caption: es.charts.income(income),
              },
              {
                share: barShare(month.expenseCents, max),
                tone: 'expense',
                caption: es.charts.expenses(expense),
              },
            ]}
            accessibilityLabel={es.charts.flowRow(name, income, expense, difference)}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  chooser: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  categoriesLabel: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  categories: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  notice: { padding: spacing.md, gap: spacing.sm },
  loading: { padding: spacing.xl },
  total: { gap: spacing.xxs, paddingBottom: spacing.md },
});
