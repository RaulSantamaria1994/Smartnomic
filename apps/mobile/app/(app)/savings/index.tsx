import type { SavingsGoalDto } from '@smartnomic/api';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { Section } from '../../../src/design/Section';
import { EmptyState } from '../../../src/design/EmptyState';
import { SavingsRow } from '../../../src/design/SavingsRow';
import { spacing } from '../../../src/design/tokens';
import { useCan, useSavings } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { useHousehold } from '../../../src/households/active';

/** Huchas del hogar: en curso, conseguidas y cerradas (especificación 005). */
export default function SavingsList() {
  const { household } = useHousehold();
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
    <Screen title={es.savings.title} back bleed>
      {savings.error && (
        <View style={styles.pad}>
          <Message text={savings.error.message} />
        </View>
      )}
      {goals.length === 0 ? (
        <EmptyState
          icon="savings"
          title={es.savings.empty}
          hint={es.savings.emptyHint}
          {...(create && { action: create })}
        />
      ) : (
        <>
          {create && <View style={styles.pad}>{create}</View>}
          {sections
            .filter(([, list]) => list.length > 0)
            .map(([title, list]) => (
              <Section key={title} title={title}>
                {list.map((goal) => (
                  <SavingsRow
                    key={goal.id}
                    goal={goal}
                    onPress={() => router.push(`/savings/${goal.id}`)}
                  />
                ))}
              </Section>
            ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: spacing.md },
});
