import { MAX_HOUSEHOLDS } from '@smartnomic/domain';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { Icon, ListRow, Section } from '../../../src/design';
import { color, spacing } from '../../../src/design/tokens';
import { useHousehold, useSwitchHousehold } from '../../../src/households/active';
import { es } from '../../../src/i18n/es';

/**
 * Tus hogares (especificación 013, RF-1303): el elegido marcado, tu rol y con quién lo
 * compartes en cada uno, para distinguir dos con el mismo nombre. Tocar uno lo elige.
 */
export default function Households() {
  const { me, household: current } = useHousehold();
  const switchTo = useSwitchHousehold();
  const list = me.data?.households ?? [];
  const members = useQueries({
    queries: list.map(({ household }) => ({
      queryKey: queryKeys.members(household.id),
      queryFn: () => api.members(household.id),
    })),
  });

  if (me.isPending) {
    return (
      <Screen title={es.households.title} back>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }
  if (me.error) {
    return (
      <Screen title={es.households.title} back>
        <Message text={me.error.message} />
      </Screen>
    );
  }

  const atLimit = list.length >= MAX_HOUSEHOLDS;
  return (
    <Screen title={es.households.title} back bleed>
      <Section>
        {list.map(({ household, member }, index) => {
          const chosen = household.id === current?.id;
          const others = (members[index]?.data?.members ?? [])
            .filter((m) => !m.isMe)
            .map((m) => m.name);
          const detail = `${es.home.roles[member.role]} · ${es.households.withOthers(others)}`;
          return (
            <ListRow
              key={household.id}
              title={household.name}
              detail={detail}
              accessibilityLabel={`${household.name}. ${detail}${chosen ? `. ${es.households.current}` : ''}`}
              trailing={chosen ? <Icon name="check" tint={color.text.accent} /> : undefined}
              onPress={() => {
                switchTo(household.id);
                // Vuelve a la pestaña desde la que se abrió, ya con el hogar nuevo.
                router.back();
              }}
            />
          );
        })}
      </Section>
      <View style={styles.actions}>
        {atLimit ? (
          <Message text={es.households.atLimit} />
        ) : (
          <Button
            variant="secondary"
            label={es.households.create}
            onPress={() => router.push('/households/new')}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { padding: spacing.md, gap: spacing.md },
});
