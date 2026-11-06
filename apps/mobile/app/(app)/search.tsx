import type { Category, SearchFilters, Transaction } from '@smartnomic/api';
import { parseAmount, rangeError, type DateString, type TransactionKind } from '@smartnomic/domain';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ApiError } from '../../src/api/http';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { TextField } from '../../src/components/TextField';
import { TransactionRow } from '../../src/components/TransactionRow';
import { exportTransactions } from '../../src/export/export-transactions';
import { Amount, AppText, CategoryIcon, EmptyState, Section } from '../../src/design';
import { spacing } from '../../src/design/tokens';
import { amountErrorMessage, formatMoney, formatShortDate, parseShortDate } from '../../src/format';
import { useCan, useCategories, useMe, useMembers, useSearch } from '../../src/hooks/data';
import { es } from '../../src/i18n/es';

type KindFilter = 'all' | TransactionKind;

/** Tiempo sin escribir tras el que se aplica un campo de texto. */
const TYPING_PAUSE_MS = 400;

/** El texto de un campo, aplicado al dejar de escribir o al pulsar «Intro». */
function useAppliedText() {
  const [text, setText] = useState('');
  const [applied, setApplied] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setApplied(text), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text]);
  return { text, setText, applied, apply: () => setApplied(text) };
}

/** Una fecha escrita: vacía, válida o con error. */
function readDate(text: string): { value?: DateString; error?: string } {
  if (text.trim() === '') return {};
  const value = parseShortDate(text);
  return value ? { value } : { error: es.search.dateInvalid };
}

/** Un importe escrito: vacío, válido (en céntimos) o con error. */
function readAmount(text: string): { value?: number; error?: string } {
  if (text.trim() === '') return {};
  const parsed = parseAmount(text);
  if (parsed.ok) return { value: parsed.value };
  // El mensaje general de «negativo» habla de elegir gasto o ingreso, que aquí no aplica.
  return {
    error:
      parsed.error === 'negative' ? es.search.amountNegative : amountErrorMessage(parsed.error),
  };
}

/**
 * «Buscar movimientos» (especificación 009): filtros arriba y, debajo, cuántos son, cuánto
 * suman y la lista de 100 en 100. Se abre con la lupa de «Mes».
 */
export default function Search() {
  const me = useMe();
  const household = me.data?.household;
  const categories = useCategories(household?.id);
  const members = useMembers(household?.id);
  const can = useCan();
  const [kind, setKind] = useState<KindFilter>('all');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const amountFrom = useAppliedText();
  const amountTo = useAppliedText();
  const dateFrom = useAppliedText();
  const dateTo = useAppliedText();

  // Importes y fechas se comprueban con lo aplicado: el error no salta a mitad de escribir.
  const min = readAmount(amountFrom.applied);
  const max = readAmount(amountTo.applied);
  const amountsReversed = rangeError(min.value, max.value) !== null;
  const from = readDate(dateFrom.applied);
  const to = readDate(dateTo.applied);
  const datesReversed = rangeError(from.value, to.value) !== null;

  const filters = useMemo<SearchFilters>(
    () => ({
      ...(kind !== 'all' && { kind }),
      categoryIds,
      // Un filtro con error no se envía hasta corregirlo.
      ...(!amountsReversed && min.value !== undefined && { minCents: min.value }),
      ...(!amountsReversed && max.value !== undefined && { maxCents: max.value }),
      ...(!datesReversed && from.value && { from: from.value }),
      ...(!datesReversed && to.value && { to: to.value }),
    }),
    [kind, categoryIds, amountsReversed, min.value, max.value, datesReversed, from.value, to.value],
  );
  const search = useSearch(household?.id, filters);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!household) {
    return (
      <Screen title={es.search.title} back>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  const all = categories.data?.categories ?? [];
  const fits = (c: Category) => kind === 'all' || c.kind === kind;
  const active = all.filter((c) => !c.archived && fits(c));
  const archived = all.filter((c) => c.archived && fits(c));
  const byId = new Map(all.map((c) => [c.id, c]));
  const toggle = (id: string) =>
    setCategoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const changeKind = (next: KindFilter) => {
    setKind(next);
    // Las categorías elegidas que ya no encajan con el tipo se quitan.
    setCategoryIds((ids) => ids.filter((id) => next === 'all' || byId.get(id)?.kind === next));
  };
  const hasFilters =
    kind !== 'all' ||
    categoryIds.length > 0 ||
    amountFrom.text.trim() !== '' ||
    amountTo.text.trim() !== '' ||
    dateFrom.text.trim() !== '' ||
    dateTo.text.trim() !== '';
  const clear = () => {
    setKind('all');
    setCategoryIds([]);
    amountFrom.setText('');
    amountTo.setText('');
    dateFrom.setText('');
    dateTo.setText('');
  };

  // Exporta exactamente lo que muestra la búsqueda: los mismos filtros (especificación 010).
  async function runExport() {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      await exportTransactions(household!.id, filters);
    } catch (e) {
      setExportError(
        e instanceof ApiError && e.code === 'network'
          ? es.search.exportOffline
          : e instanceof Error
            ? e.message
            : es.auth.errors.unknown,
      );
    } finally {
      setExporting(false);
    }
  }

  const memberList = members.data?.members ?? [];
  const names = new Map(memberList.map((m) => [m.id, m.name]));
  const shared = memberList.length > 1;
  const authorOf = (t: Transaction) =>
    members.data && (shared || t.memberId !== me.data?.member.id)
      ? (t.memberId && names.get(t.memberId)) || es.household.formerMember
      : null;
  const canWrite = can('transactions.write');
  const pages = search.data?.pages ?? [];
  const totals = pages[0]?.totals;
  const results = pages.flatMap((p) => p.transactions);
  const offline = search.error instanceof ApiError && search.error.code === 'network';

  const chip = (c: Category, label = c.name) => (
    <Chip
      key={c.id}
      label={label}
      multiple
      selected={categoryIds.includes(c.id)}
      onPress={() => toggle(c.id)}
      icon={<CategoryIcon icon={c.icon} tone={c.color} size="sm" />}
    />
  );

  return (
    <Screen title={es.search.title} back bleed>
      <Section title={es.search.filters} separated padded>
        <View style={styles.filters}>
          <SegmentedControl
            accessibilityLabel={es.search.kind}
            options={[
              { value: 'all', label: es.search.kinds.all },
              { value: 'expense', label: es.search.kinds.expense },
              { value: 'income', label: es.search.kinds.income },
            ]}
            value={kind}
            onChange={changeKind}
          />
          <View style={styles.group}>
            <AppText variant="small" tone="muted">
              {es.search.categories}
            </AppText>
            <View style={styles.chips} role="group" aria-label={es.search.categories}>
              {active.map((c) => chip(c))}
            </View>
            {archived.length > 0 && (
              <>
                <AppText variant="small" tone="muted">
                  {es.search.archived}
                </AppText>
                <View style={styles.chips} role="group" aria-label={es.search.archived}>
                  {archived.map((c) => chip(c, es.search.archivedName(c.name)))}
                </View>
              </>
            )}
          </View>
          <View style={styles.pair}>
            <View style={styles.half}>
              <TextField
                label={es.search.amountFrom}
                value={amountFrom.text}
                onChangeText={amountFrom.setText}
                onSubmitEditing={amountFrom.apply}
                keyboardType="decimal-pad"
                suffix="€"
                error={min.error ?? (amountsReversed ? es.search.amountReversed : null)}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label={es.search.amountTo}
                value={amountTo.text}
                onChangeText={amountTo.setText}
                onSubmitEditing={amountTo.apply}
                keyboardType="decimal-pad"
                suffix="€"
                error={max.error}
              />
            </View>
          </View>
          <View style={styles.pair}>
            <View style={styles.half}>
              <TextField
                label={es.search.dateFrom}
                value={dateFrom.text}
                onChangeText={dateFrom.setText}
                onSubmitEditing={dateFrom.apply}
                keyboardType="numbers-and-punctuation"
                error={from.error ?? (datesReversed ? es.search.dateReversed : null)}
              />
            </View>
            <View style={styles.half}>
              <TextField
                label={es.search.dateTo}
                value={dateTo.text}
                onChangeText={dateTo.setText}
                onSubmitEditing={dateTo.apply}
                keyboardType="numbers-and-punctuation"
                error={to.error}
              />
            </View>
          </View>
          {hasFilters && (
            <View style={styles.clear}>
              <Button label={es.search.clear} variant="link" onPress={clear} />
            </View>
          )}
        </View>
      </Section>

      {offline && (
        <View style={styles.notice}>
          <Message text={es.search.offline} />
        </View>
      )}

      {totals && (
        <View
          style={styles.totals}
          accessible
          accessibilityLabel={es.search.totals(
            es.search.count(totals.count),
            formatMoney(totals.expenseCents),
            formatMoney(totals.incomeCents),
          )}
          accessibilityLiveRegion="polite"
        >
          <AppText variant="bodyStrong">{es.search.count(totals.count)}</AppText>
          <View style={styles.sums}>
            <View>
              <AppText variant="caption" tone="muted">
                {es.search.expenses}
              </AppText>
              <Amount cents={totals.expenseCents} />
            </View>
            <View>
              <AppText variant="caption" tone="muted">
                {es.search.income}
              </AppText>
              <Amount cents={totals.incomeCents} kind="income" />
            </View>
          </View>
        </View>
      )}

      {totals && totals.count > 0 && (
        <View style={styles.export}>
          {/* Fuera del bloque de totales, que el lector de pantalla lee como uno solo. */}
          <Button
            label={es.search.export}
            variant="secondary"
            loading={exporting}
            onPress={() => void runExport()}
          />
          {exportError && <Message text={exportError} />}
        </View>
      )}

      {search.isPending ? (
        <View style={styles.notice}>
          <ActivityIndicator accessibilityLabel={es.common.loading} />
        </View>
      ) : totals?.count === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="search"
            title={es.search.none}
            hint={es.search.noneHint}
            action={<Button label={es.search.clear} variant="secondary" onPress={clear} />}
          />
        ) : (
          <EmptyState icon="search" title={es.search.empty} />
        )
      ) : search.error && results.length === 0 && !offline ? (
        <View style={styles.notice}>
          <Message text={es.search.error} />
          <Button label={es.common.retry} onPress={() => search.refetch()} />
        </View>
      ) : (
        <>
          {results.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              when={formatShortDate(t.date)}
              category={byId.get(t.categoryId)}
              author={authorOf(t)}
              onPress={canWrite ? () => router.push(`/transaction/${t.id}`) : undefined}
            />
          ))}
          {search.hasNextPage && (
            <View style={styles.more}>
              <Button
                label={es.search.showMore}
                variant="secondary"
                loading={search.isFetchingNextPage}
                onPress={() => search.fetchNextPage()}
              />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing.md, paddingBottom: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  half: { flexGrow: 1, flexBasis: 140 },
  clear: { alignItems: 'flex-start' },
  notice: { padding: spacing.md, gap: spacing.sm },
  totals: { padding: spacing.md, gap: spacing.sm },
  sums: { flexDirection: 'row', gap: spacing.xl },
  export: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  more: { padding: spacing.md, alignItems: 'flex-start' },
});
