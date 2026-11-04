import type { Category } from '@smartnomic/api';
import { parseAmount } from '@smartnomic/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api, queryKeys } from '../../src/api/client';
import { ApiError } from '../../src/api/http';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { AppText, CategoryIcon, Section } from '../../src/design';
import { color, spacing } from '../../src/design/tokens';
import { amountErrorMessage, formatAmountInput, formatMoney } from '../../src/format';
import { currentPeriodStart, useCan, useCategories, useMe, usePeriod } from '../../src/hooks/data';
import { es } from '../../src/i18n/es';

/**
 * Presupuestos de todas las categorías de gasto a la vez (especificación 007, historia 1):
 * un importe por categoría y un único «Guardar», que envía solo lo que ha cambiado. Valen
 * desde el periodo en curso.
 */
export default function Budgets() {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const start = household
    ? currentPeriodStart(household.timezone, household.monthStartDay)
    : undefined;
  const period = usePeriod(household?.id, start);
  const categories = useCategories(household?.id);
  const canWrite = useCan()('budgets.write');
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [message, setMessage] = useState<{ text: string; kind: 'error' | 'success' } | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = new Map((period.data?.budgets ?? []).map((b) => [b.categoryId, b.amountCents]));
  const expenses = (categories.data?.categories ?? []).filter(
    (c) => c.kind === 'expense' && !c.archived,
  );
  const initial = (c: Category) => {
    const cents = saved.get(c.id);
    return cents === undefined ? '' : formatAmountInput(cents);
  };

  // Los campos empiezan con lo guardado cuando llega; después son de quien escribe.
  const ready = Boolean(household && period.data && categories.data);
  useEffect(() => {
    if (ready && values === null) {
      setValues(Object.fromEntries(expenses.map((c) => [c.id, initial(c)])));
    }
  }, [ready]); // Solo la primera vez que llegan los datos.

  if (!household || !ready || values === null) {
    return (
      <Screen title={es.budgets.title} back>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  async function save() {
    setMessage(null);
    const changes: (() => Promise<unknown>)[] = [];
    for (const c of expenses) {
      const text = (values![c.id] ?? '').trim();
      if (text === initial(c)) continue;
      if (text === '') {
        changes.push(() => api.deleteBudget(household!.id, c.id));
        continue;
      }
      const parsed = parseAmount(text);
      if (!parsed.ok) {
        return setMessage({
          kind: 'error',
          text: es.budgets.error(c.name, amountErrorMessage(parsed.error)),
        });
      }
      if (parsed.value === saved.get(c.id)) continue;
      changes.push(() => api.saveBudget(household!.id, c.id, { amountCents: parsed.value }));
    }
    if (changes.length === 0) return setMessage({ kind: 'success', text: es.budgets.unchanged });
    setSaving(true);
    try {
      await Promise.all(changes.map((change) => change()));
      await queryClient.invalidateQueries({ queryKey: queryKeys.periods(household!.id) });
      setMessage({ kind: 'success', text: es.budgets.saved });
    } catch (e) {
      setMessage({
        kind: 'error',
        text:
          e instanceof ApiError && e.code === 'network'
            ? es.transaction.errors.offline
            : e instanceof Error
              ? e.message
              : es.auth.errors.unknown,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title={es.budgets.title} back bleed>
      <View style={styles.intro}>
        <AppText variant="caption" tone="muted">
          {canWrite ? es.budgets.hint : es.budgets.readOnly}
        </AppText>
      </View>
      <Section>
        {expenses.length === 0 && (
          <AppText variant="body" tone="muted" style={styles.intro}>
            {es.budgets.empty}
          </AppText>
        )}
        {expenses.map((c) => (
          <View key={c.id} style={styles.row}>
            <CategoryIcon icon={c.icon} tone={c.color} />
            <AppText variant="body" style={styles.name} numberOfLines={2}>
              {c.name}
            </AppText>
            {canWrite ? (
              <View style={styles.amount}>
                <TextField
                  label={es.budgets.amountLabel(c.name)}
                  hideLabel
                  value={values[c.id] ?? ''}
                  onChangeText={(text) => setValues({ ...values, [c.id]: text })}
                  keyboardType="decimal-pad"
                  suffix="€"
                />
              </View>
            ) : (
              <AppText variant="body" tone={saved.has(c.id) ? 'primary' : 'muted'} tabular>
                {saved.has(c.id) ? formatMoney(saved.get(c.id)!) : es.budgets.none}
              </AppText>
            )}
          </View>
        ))}
      </Section>
      {canWrite && (
        <View style={styles.actions}>
          {message && <Message text={message.text} kind={message.kind} />}
          <Button label={es.budgets.save} onPress={() => void save()} loading={saving} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { padding: spacing.md, paddingBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: color.border.default,
  },
  name: { flex: 1, minWidth: 0 },
  amount: { width: 136 },
  actions: { padding: spacing.md, gap: spacing.ms },
});
