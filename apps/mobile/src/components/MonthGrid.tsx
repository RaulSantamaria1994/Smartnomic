import { monthGrid, parseDate, type DateString } from '@smartnomic/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDay } from '../format';
import { es } from '../i18n/es';
import { colors, spacing } from '../theme';
import { color, typography } from '../design/tokens';

interface Props {
  month: string;
  /** Vencimientos y aportaciones a huchas del mes, con su estado. */
  items: readonly { dueDate: DateString; status: string }[];
  today: DateString;
  selected: DateString | null;
  onSelect: (date: DateString) => void;
}

interface DaySummary {
  count: number;
  overdue: number;
  pending: number;
}

/**
 * Cuadrícula del mes, de lunes a domingo (RF-102). Cada día con vencimientos lleva una
 * marca: roja si hay atrasados, del color principal si hay pendientes y gris si todo está
 * resuelto. Para el lector de pantalla, cada día dice su fecha y cuántos tiene (RF-108).
 */
export function MonthGrid({ month, items, today, selected, onSelect }: Props) {
  const summary = new Map<DateString, DaySummary>();
  for (const item of items) {
    const day = summary.get(item.dueDate) ?? { count: 0, overdue: 0, pending: 0 };
    day.count += 1;
    if (item.status === 'overdue') day.overdue += 1;
    if (item.status === 'pending') day.pending += 1;
    summary.set(item.dueDate, day);
  }

  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {es.calendar.weekdays.map((letter, index) => (
          <Text
            key={letter}
            style={styles.weekday}
            accessibilityLabel={es.calendar.weekdayNames[index]}
          >
            {letter}
          </Text>
        ))}
      </View>
      {monthGrid(month).map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((date, column) =>
            date ? (
              <Day
                key={date}
                date={date}
                summary={summary.get(date)}
                isToday={date === today}
                isSelected={date === selected}
                onPress={() => onSelect(date)}
              />
            ) : (
              <View key={`empty-${column}`} style={styles.cell} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

function Day({
  date,
  summary,
  isToday,
  isSelected,
  onPress,
}: {
  date: DateString;
  summary: DaySummary | undefined;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const count = summary?.count ?? 0;
  const markColor = !summary
    ? undefined
    : summary.overdue > 0
      ? color.mark.overdue
      : summary.pending > 0
        ? color.mark.pending
        : color.mark.resolved;
  const label =
    es.calendar.dayLabel(formatDay(date), count, summary?.overdue ?? 0) +
    (isToday ? es.calendar.todaySuffix : '');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.cell,
        styles.day,
        isToday && styles.today,
        isSelected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.number, isSelected && styles.selectedText]}>{parseDate(date).day}</Text>
      <View style={styles.markRow}>
        {markColor && (
          <View
            style={[styles.mark, { backgroundColor: isSelected ? color.text.onAccent : markColor }]}
          />
        )}
        {count > 1 && (
          <Text style={[styles.count, isSelected && styles.selectedText]}>{count}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: 2,
  },
  week: { flexDirection: 'row', gap: 2 },
  weekday: {
    ...typography.label,
    flex: 1,
    textAlign: 'center',
    color: colors.muted,
    paddingVertical: spacing.xs,
  },
  cell: { flex: 1, minHeight: 48, minWidth: 0 },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 2,
  },
  today: { borderColor: color.border.focus },
  selected: { backgroundColor: color.bg.accent, borderColor: color.bg.accent },
  pressed: { opacity: 0.7 },
  number: { ...typography.body, color: colors.text },
  selectedText: { color: colors.onPrimary },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 18 },
  mark: { width: 8, height: 8, borderRadius: 4 },
  count: { ...typography.label, color: colors.muted },
});
