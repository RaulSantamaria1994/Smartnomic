import type { UpcomingOccurrenceDto } from '@smartnomic/api';
import { addDays } from '@smartnomic/domain';
import { StyleSheet, Text, View } from 'react-native';
import { es } from '../i18n/es';
import { openNotificationSettings, remindersSupported } from '../reminders/reminders';
import { useNotificationPermission } from '../state/permission';
import { colors, spacing } from '../theme';
import { Button } from './Button';

/** Días en que un vencimiento cuenta como «pronto» para destacarlo. */
const SOON_DAYS = 3;

/**
 * Avisos dentro de la app: si faltan permisos de notificaciones (RF-035) y, en el
 * navegador, los vencimientos atrasados o de los próximos días (RF-036).
 */
export function ReminderBanners({
  occurrences,
  today,
  hasRules,
  remindersEnabled,
}: {
  occurrences: UpcomingOccurrenceDto[] | undefined;
  today: string | undefined;
  hasRules: boolean;
  remindersEnabled: boolean;
}) {
  const permission = useNotificationPermission((state) => state.status);
  const overdue = occurrences?.filter((o) => o.overdue).length ?? 0;
  const soon =
    today && occurrences
      ? occurrences.filter((o) => !o.overdue && o.dueDate <= addDays(today, SOON_DAYS)).length
      : 0;

  return (
    <>
      {remindersSupported && hasRules && remindersEnabled && permission === 'denied' && (
        <View style={[styles.banner, styles.warning]} accessibilityRole="alert">
          <Text style={styles.title}>{es.reminders.deniedTitle}</Text>
          <Text style={styles.text}>{es.reminders.deniedText}</Text>
          <Button
            variant="link"
            label={es.reminders.openSettings}
            onPress={() => void openNotificationSettings()}
          />
        </View>
      )}
      {!remindersSupported && (overdue > 0 || soon > 0) && (
        <View
          style={[styles.banner, overdue > 0 ? styles.danger : styles.info]}
          accessibilityRole="alert"
        >
          {overdue > 0 && <Text style={styles.title}>{es.reminders.overdueTitle(overdue)}</Text>}
          {soon > 0 && <Text style={styles.title}>{es.reminders.soonTitle(soon)}</Text>}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 12, padding: spacing.md, gap: spacing.xs, borderWidth: 1 },
  warning: { backgroundColor: '#FFF4E5', borderColor: '#F0B45B' },
  danger: { backgroundColor: '#FDECEA', borderColor: '#E8A39C' },
  info: { backgroundColor: '#E8F0FD', borderColor: '#9DB8E8' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.text },
});
