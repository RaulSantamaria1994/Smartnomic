import type { Category, ChartsResponse } from '@smartnomic/api';
import {
  barShare,
  periodOf,
  shares,
  shiftPeriod,
  sortByAmount,
  type DateString,
} from '@smartnomic/domain';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../../src/api/http';
import { Button } from '../../../src/components/Button';
import { Chip } from '../../../src/components/Chip';
import { Message } from '../../../src/components/Message';
import { MonthSlide } from '../../../src/components/MonthSlide';
import { Screen } from '../../../src/components/Screen';
import { Amount, AppText, CategoryIcon, ChartRow, EmptyState, Section } from '../../../src/design';
import { spacing } from '../../../src/design/tokens';
import { formatMoney, formatPeriod } from '../../../src/format';
import {
  currentPeriodStart,
  useCan,
  useCategories,
  useCharts,
  useMe,
} from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';

type ChartKind = 'category';

const CHARTS: { kind: ChartKind; label: string }[] = [
  { kind: 'category', label: es.charts.kinds.category },
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
  const periodStart =
    start ??
    (household ? currentPeriodStart(household.timezone, household.monthStartDay) : undefined);
  const charts = useCharts(household?.id, periodStart);
  const categories = useCategories(household?.id);
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
            onPress={() => setKind(chart.kind)}
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
          kind === 'category' && <CategoryChart data={charts.data} byId={byId} />
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
function CategoryChart({ data, byId }: { data: ChartsResponse; byId: Map<string, Category> }) {
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
  notice: { padding: spacing.md, gap: spacing.sm },
  loading: { padding: spacing.xl },
  total: { gap: spacing.xxs, paddingBottom: spacing.md },
});
