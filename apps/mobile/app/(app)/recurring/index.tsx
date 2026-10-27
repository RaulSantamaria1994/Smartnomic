import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { describeSchedule, formatMoney } from '../../../src/format';
import { useCategories, useMe, useRecurring } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { colors, spacing } from '../../../src/theme';

/** Lista de pagos y cobros recurrentes del hogar (T062). */
export default function RecurringList() {
  const me = useMe();
  const household = me.data?.household;
  const rules = useRecurring(household?.id);
  const categories = useCategories(household?.id);
  const canWrite = me.data?.member.role !== 'viewer';
  const byId = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));

  return (
    <Screen title={es.recurring.title}>
      {rules.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
      {rules.error && <Message text={rules.error.message} />}
      {rules.data && rules.data.rules.length === 0 && (
        <Text style={styles.muted}>{es.recurring.empty}</Text>
      )}
      {rules.data && rules.data.rules.length > 0 && (
        <View style={styles.list}>
          {rules.data.rules.map((rule) => {
            const category = byId.get(rule.categoryId);
            return (
              <Pressable
                key={rule.id}
                disabled={!canWrite}
                onPress={() => router.push(`/recurring/${rule.id}`)}
                accessibilityRole={canWrite ? 'button' : 'text'}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.icon}>{category?.icon ?? '•'}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.title, !rule.active && styles.inactive]}>{rule.name}</Text>
                  <Text style={styles.muted}>
                    {describeSchedule(rule)}
                    {rule.active ? '' : ` · ${es.recurring.inactive}`}
                  </Text>
                </View>
                <Text style={[styles.amount, rule.kind === 'income' && { color: colors.success }]}>
                  {formatMoney(rule.amountCents)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {canWrite && (
        <Button label={es.recurring.add} onPress={() => router.push('/recurring/new')} />
      )}
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  title: { fontSize: 16, color: colors.text, fontWeight: '500' },
  inactive: { color: colors.muted, textDecorationLine: 'line-through' },
  amount: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
});
