import type { SavingsGoalDto } from '@smartnomic/api';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { Card } from '../../../src/design/Card';
import { EmptyState } from '../../../src/design/EmptyState';
import { SavingsCard } from '../../../src/design/SavingsCard';
import { AppText } from '../../../src/design/Text';
import { spacing } from '../../../src/design/tokens';
import { useCan, useMe, useSavings } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';

/** Huchas del hogar: en curso, conseguidas y cerradas (especificación 005). */
export default function SavingsList() {
  const me = useMe();
  const household = me.data?.household;
  const savings = useSavings(household?.id);
  const canWrite = useCan()('savings.write');

  if (!household || savings.isPending) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  const goals = savings.data?.goals ?? [];
  const sections: [string, SavingsGoalDto[]][] = [
    [es.savings.active, goals.filter((g) => ['active', 'expired'].includes(g.plan.status))],
    [es.savings.achievedSection, goals.filter((g) => g.plan.status === 'achieved')],
    [es.savings.closedSection, goals.filter((g) => g.plan.status === 'closed')],
  ];
  const create = canWrite ? (
    <Button label={es.savings.newTitle} onPress={() => router.push('/savings/new')} />
  ) : null;

  return (
    <Screen title={es.savings.title} align="top">
      {savings.error && <Message text={savings.error.message} />}
      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon="savings"
            title={es.savings.empty}
            hint={es.savings.emptyHint}
            {...(create && { action: create })}
          />
        </Card>
      ) : (
        <>
          {create}
          {sections
            .filter(([, list]) => list.length > 0)
            .map(([title, list]) => (
              <View key={title} style={styles.section}>
                <AppText variant="heading" accessibilityRole="header">
                  {title}
                </AppText>
                {list.map((goal) => (
                  <SavingsCard key={goal.id} goal={goal} />
                ))}
              </View>
            ))}
        </>
      )}
      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
