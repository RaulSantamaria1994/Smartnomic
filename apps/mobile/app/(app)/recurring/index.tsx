import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { describeSchedule } from '../../../src/format';
import { useCan, useCategories, useMe, useRecurring } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { Amount, Card, CategoryIcon, EmptyState, ListRow } from '../../../src/design';

/** Lista de pagos y cobros recurrentes del hogar (T062). */
export default function RecurringList() {
  const me = useMe();
  const household = me.data?.household;
  const rules = useRecurring(household?.id);
  const categories = useCategories(household?.id);
  const canWrite = useCan()('recurring.write');
  const byId = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));

  return (
    <Screen title={es.recurring.title}>
      {rules.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
      {rules.error && <Message text={rules.error.message} />}
      {rules.data && rules.data.rules.length === 0 && (
        <EmptyState icon="recurring" title={es.recurring.empty} />
      )}
      {rules.data && rules.data.rules.length > 0 && (
        <Card padded={false}>
          {rules.data.rules.map((rule, index) => {
            const category = byId.get(rule.categoryId);
            const schedule =
              describeSchedule(rule) + (rule.active ? '' : ` · ${es.recurring.inactive}`);
            return (
              <ListRow
                key={rule.id}
                first={index === 0}
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
          })}
        </Card>
      )}
      {canWrite && (
        <Button label={es.recurring.add} onPress={() => router.push('/recurring/new')} />
      )}
      <Button variant="link" label={es.transaction.cancel} onPress={() => router.back()} />
    </Screen>
  );
}
