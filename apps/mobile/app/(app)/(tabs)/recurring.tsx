import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { AnimatedList } from '../../../src/components/AnimatedList';
import { Screen } from '../../../src/components/Screen';
import { describeSchedule } from '../../../src/format';
import { useCan, useCategories, useRecurring } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { Amount, CategoryIcon, EmptyState, ListRow } from '../../../src/design';
import { spacing } from '../../../src/design/tokens';
import { useHousehold } from '../../../src/households/active';

/** Lista de pagos y cobros recurrentes del hogar (T062). */
export default function RecurringList() {
  const { household } = useHousehold();
  const rules = useRecurring(household?.id);
  const categories = useCategories(household?.id);
  const can = useCan();
  const canWrite = can('recurring.write');
  const byId = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));

  return (
    <Screen title={es.recurring.title} bleed fab={can('transactions.write')}>
      {rules.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
      {rules.error && (
        <View style={styles.block}>
          <Message text={rules.error.message} />
        </View>
      )}
      {rules.data && rules.data.rules.length === 0 && (
        <EmptyState icon="recurring" title={es.recurring.empty} />
      )}
      {rules.data && rules.data.rules.length > 0 && (
        <AnimatedList
          items={rules.data.rules}
          keyOf={(rule) => rule.id}
          render={(rule) => {
            const category = byId.get(rule.categoryId);
            const schedule =
              describeSchedule(rule) + (rule.active ? '' : ` · ${es.recurring.inactive}`);
            return (
              <ListRow
                title={rule.name}
                detail={schedule}
                strike={!rule.active}
                leading={<CategoryIcon icon={category?.icon} tone={category?.color} />}
                trailing={
                  <Amount
                    cents={rule.amountCents}
                    kind={rule.kind === 'income' ? 'income' : undefined}
                    muted={!rule.active}
                  />
                }
                onPress={canWrite ? () => router.push(`/recurring/${rule.id}`) : undefined}
              />
            );
          }}
        />
      )}
      {canWrite && (
        <View style={styles.block}>
          <Button label={es.recurring.add} onPress={() => router.push('/recurring/new')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { padding: spacing.md },
});
