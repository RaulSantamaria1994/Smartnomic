import type { Category, RecurringRule, Transaction, UpcomingOccurrenceDto } from '@smartnomic/api';
import {
  addDays,
  compareDates,
  daysBetween,
  parseDate,
  periodOf,
  shiftPeriod,
  type DateString,
} from '@smartnomic/domain';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../../src/api/http';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { ReminderBanners } from '../../src/components/ReminderBanners';
import {
  Amount,
  AppText,
  Card,
  CategoryIcon,
  EmptyState,
  Icon,
  ListRow,
  StatusPill,
  SummaryCard,
  type IconName,
  type PillKind,
} from '../../src/design';
import { color, layout, radius, shadow, size, spacing } from '../../src/design/tokens';
import {
  formatDay,
  formatMoney,
  formatMonthShort,
  formatPeriod,
  formatRelativeDue,
} from '../../src/format';
import {
  currentPeriodStart,
  todayIn,
  useCan,
  useCategories,
  useMe,
  useMembers,
  usePeriod,
  useRecurring,
  useUpcoming,
} from '../../src/hooks/data';
import { es } from '../../src/i18n/es';
import { signOut } from '../../src/session/sign-out';

/**
 * Movimientos que se pintan de una vez. Con cientos en un periodo, pintarlos todos retrasa
 * también el resumen (CE-003).
 */
const PAGE_SIZE = 100;

/** Días que faltan para que un vencimiento se destaque como «vence pronto». */
const SOON_DAYS = 3;

/** Pantalla «Mes»: resumen del periodo, próximos pagos y movimientos (especificación 003). */
export default function Month() {
  const queryClient = useQueryClient();
  const me = useMe();
  const household = me.data?.household;
  const [start, setStart] = useState<DateString | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const thisPeriod = household
    ? currentPeriodStart(household.timezone, household.monthStartDay)
    : undefined;
  const periodStart = start ?? thisPeriod;
  const period = usePeriod(household?.id, periodStart);
  const categories = useCategories(household?.id);
  const upcoming = useUpcoming(household?.id);
  const rules = useRecurring(household?.id);
  const can = useCan();
  const canWrite = can('transactions.write');
  const members = useMembers(household?.id);

  if (me.isPending) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </SafeAreaView>
    );
  }
  if (!household || !periodStart || !me.data) {
    return (
      <SafeAreaView style={styles.center}>
        <Message text={me.error?.message ?? es.auth.errors.unknown} />
        <Button label={es.common.retry} onPress={() => me.refetch()} />
      </SafeAreaView>
    );
  }

  const today = todayIn(household.timezone);
  const current = periodOf(periodStart, household.monthStartDay);
  const move = (n: number) => {
    setStart(shiftPeriod(current, n, household.monthStartDay).start);
    setShown(PAGE_SIZE);
  };
  const byId = new Map((categories.data?.categories ?? []).map((c) => [c.id, c]));
  // Se dice quién apuntó cada movimiento (RF-009), salvo si el hogar es de una sola persona
  // y lo apuntó ella.
  const memberList = members.data?.members ?? [];
  const names = new Map(memberList.map((m) => [m.id, m.name]));
  const shared = memberList.length > 1;
  const authorOf = (t: Transaction) =>
    members.data && (shared || t.memberId !== me.data?.member.id)
      ? (t.memberId && names.get(t.memberId)) || es.household.formerMember
      : null;
  const offline = period.error instanceof ApiError && period.error.code === 'network';
  const data = period.data;
  const userName = me.data.user.name;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={period.isRefetching}
            onRefresh={() => {
              void period.refetch();
              void categories.refetch();
              void upcoming.refetch();
              void rules.refetch();
              void members.refetch();
            }}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.avatar} accessible={false} aria-hidden>
            <AppText variant="label" tone="accent">
              {initials(userName)}
            </AppText>
          </View>
          <View style={styles.greeting}>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {household.name}
            </AppText>
            <AppText variant="heading" numberOfLines={1}>
              {es.home.greeting(userName.split(' ')[0] ?? userName)}
            </AppText>
          </View>
          <IconLink
            icon="household"
            label={es.household.title}
            onPress={() => router.push('/household/members')}
          />
          <IconLink
            icon="settings"
            label={es.settings.title}
            onPress={() => router.push('/account')}
          />
        </View>

        <View style={styles.periodBar}>
          <RoundButton icon="back" label={es.month.previous} onPress={() => move(-1)} />
          <AppText variant="title" accessibilityRole="header">
            {formatPeriod(current, household.monthStartDay)}
          </AppText>
          <RoundButton icon="forward" label={es.month.next} onPress={() => move(1)} />
        </View>

        {offline && <Message text={es.month.offline} />}

        <ReminderBanners
          occurrences={upcoming.data?.occurrences}
          today={upcoming.data?.today}
          hasRules={(rules.data?.rules.length ?? 0) > 0}
          remindersEnabled={me.data.member.remindersEnabled}
        />

        <SummaryCard
          incomeCents={data?.summary.incomeCents}
          expenseCents={data?.summary.expenseCents}
          balanceCents={data?.summary.balanceCents}
          current={periodStart === thisPeriod}
        />

        <Upcoming
          items={upcoming.data?.occurrences}
          today={upcoming.data?.today}
          rules={rules.data?.rules}
          categories={byId}
          canResolve={can('occurrences.resolve')}
        />

        <View style={styles.section}>
          <AppText variant="heading" accessibilityRole="header">
            {es.home.transactions}
          </AppText>
          {period.isPending && <ActivityIndicator accessibilityLabel={es.common.loading} />}
          {period.error && !offline && !data && <Message text={period.error.message} />}

          {data && data.transactions.length === 0 && (
            <Card>
              <EmptyState
                icon="tag"
                title={es.month.empty}
                {...(canWrite && { hint: es.month.emptyHint })}
              />
            </Card>
          )}

          {data && data.transactions.length > 0 && (
            <Card padded={false}>
              {data.transactions.slice(0, shown).map((t, index) => (
                <TransactionRow
                  key={t.id}
                  first={index === 0}
                  transaction={t}
                  today={today}
                  category={byId.get(t.categoryId)}
                  author={authorOf(t)}
                  onPress={canWrite ? () => router.push(`/transaction/${t.id}`) : undefined}
                />
              ))}
            </Card>
          )}
          {data && data.transactions.length > shown && (
            <Button
              variant="link"
              label={es.month.showMore(data.transactions.length - shown)}
              onPress={() => setShown((n) => n + PAGE_SIZE)}
            />
          )}
        </View>

        <Button variant="link" label={es.auth.signOut} onPress={() => void signOut(queryClient)} />
      </ScrollView>

      {canWrite && (
        <Pressable
          onPress={() => router.push('/new')}
          accessibilityRole="button"
          accessibilityLabel={`+ ${es.month.add}`}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Icon name="plus" tint={color.text.onAccent} />
          <AppText variant="bodyStrong" tone="onAccent">
            {es.month.add}
          </AppText>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

function IconLink({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name={icon} />
    </Pressable>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name={icon} tint={color.text.link} />
    </Pressable>
  );
}

/** «Próximos pagos»: atrasados y de los próximos 30 días (RF-023), en tarjetas. */
function Upcoming({
  items,
  today,
  rules,
  categories,
  canResolve,
}: {
  items: UpcomingOccurrenceDto[] | undefined;
  today: string | undefined;
  rules: RecurringRule[] | undefined;
  categories: Map<string, Category>;
  canResolve: boolean;
}) {
  if (!items || !today || !rules) return null;
  const byId = new Map(rules.map((r) => [r.id, r]));
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading" accessibilityRole="header">
          {es.recurring.upcomingTitle}
        </AppText>
        <View style={styles.sectionActions}>
          <Button
            variant="link"
            label={es.calendar.open}
            accessibilityLabel={es.calendar.title}
            onPress={() => router.push('/calendar')}
          />
          <Button
            variant="link"
            label={es.recurring.manage}
            accessibilityLabel={es.recurring.title}
            onPress={() => router.push('/recurring')}
          />
        </View>
      </View>
      {rules.length === 0 && (
        <Card>
          <EmptyState icon="recurring" title={es.recurring.empty} />
        </Card>
      )}
      {rules.length > 0 && items.length === 0 && (
        <AppText variant="caption" tone="muted">
          {es.recurring.noUpcoming}
        </AppText>
      )}
      {items.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cards}
        >
          {items.map((item) => {
            const rule = byId.get(item.ruleId);
            if (!rule) return null;
            return (
              <UpcomingCard
                key={`${item.ruleId}-${item.dueDate}`}
                item={item}
                rule={rule}
                category={categories.get(rule.categoryId)}
                today={today}
                onPress={
                  canResolve
                    ? () => router.push(`/occurrence/${item.ruleId}/${item.dueDate}`)
                    : undefined
                }
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function UpcomingCard({
  item,
  rule,
  category,
  today,
  onPress,
}: {
  item: UpcomingOccurrenceDto;
  rule: RecurringRule;
  category: Category | undefined;
  today: string;
  onPress: (() => void) | undefined;
}) {
  const soon = !item.overdue && compareDates(item.dueDate, addDays(today, SOON_DAYS)) <= 0;
  const kind: PillKind = item.overdue ? 'overdue' : soon ? 'soon' : 'pending';
  const when = formatRelativeDue(item.dueDate, today);
  const pill = item.overdue ? es.recurring.overdue : when;
  const status = color.status[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${rule.name}, ${formatMoney(rule.amountCents)}, ${when}${item.overdue ? `, ${es.recurring.overdue}` : ''}`}
      style={({ pressed }) => [styles.upcomingCard, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.dateBadge, { backgroundColor: status.bg }]}>
          <AppText variant="heading" style={{ color: status.fg }}>
            {parseDate(item.dueDate).day}
          </AppText>
          <AppText variant="small" style={{ color: status.fg }}>
            {formatMonthShort(item.dueDate)}
          </AppText>
        </View>
        <CategoryIcon icon={category?.icon} tone={category?.color} />
      </View>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {rule.name}
      </AppText>
      <Amount cents={rule.amountCents} kind={rule.kind === 'income' ? 'income' : undefined} />
      <StatusPill kind={kind} label={pill} />
    </Pressable>
  );
}

/** «Hoy», «Ayer» o «martes, 27 de octubre». */
function dayLabel(date: DateString, today: DateString): string {
  const days = daysBetween(today, date);
  if (days === 0) return es.recurring.today;
  if (days === -1) return es.recurring.yesterday;
  return formatDay(date);
}

function TransactionRow({
  transaction,
  today,
  category,
  author,
  onPress,
  first,
}: {
  transaction: Transaction;
  today: DateString;
  category: Category | undefined;
  author: string | null;
  onPress: (() => void) | undefined;
  first: boolean;
}) {
  const name = category?.name ?? '—';
  const detail = [
    dayLabel(transaction.date, today),
    transaction.note,
    author && es.household.byMember(author),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      first={first}
      title={name}
      detail={detail}
      leading={<CategoryIcon icon={category?.icon} tone={category?.color} />}
      trailing={<Amount cents={transaction.amountCents} kind={transaction.kind} />}
      onPress={onPress}
      accessibilityLabel={`${name}, ${formatMoney(transaction.amountCents)}, ${detail}`}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg.canvas },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: color.bg.canvas,
  },
  content: {
    padding: spacing.ml,
    paddingBottom: 120,
    gap: spacing.ml,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms },
  avatar: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    backgroundColor: color.bg.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: { flex: 1, minWidth: 0 },
  iconButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: spacing.ms },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionActions: { flexDirection: 'row' },
  cards: { gap: spacing.ms, paddingRight: spacing.md },
  upcomingCard: {
    width: 168,
    backgroundColor: color.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.default,
    padding: spacing.ms,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBadge: {
    width: 48,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.ml,
    bottom: spacing.lg,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: color.bg.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.raised,
  },
  pressed: { opacity: 0.8 },
});
