import { StyleSheet, View } from 'react-native';
import { Icon } from '../design/Icon';
import { AppText } from '../design/Text';
import { color, radius, spacing } from '../design/tokens';
import { es } from '../i18n/es';
import { useOutbox } from '../outbox/useOutbox';
import { Button } from './Button';

/**
 * Aviso de «Mes» con los movimientos apuntados sin conexión que faltan por enviar
 * (especificación 011): cuántos esperan, cuántos se han rechazado y «Enviar ahora».
 */
export function OutboxBanner({ householdId }: { householdId: string }) {
  const outbox = useOutbox();
  const mine = outbox.items.filter((p) => p.householdId === householdId);
  if (mine.length === 0) return null;
  const waiting = mine.filter((p) => p.status === 'waiting').length;
  const rejected = mine.length - waiting;
  const tone = rejected > 0 ? color.notice.danger : color.notice.warning;
  const lines = [
    waiting > 0 && es.outbox.banner(waiting),
    rejected > 0 && es.outbox.rejectedBanner(rejected),
  ].filter(Boolean) as string[];
  return (
    <View
      style={[styles.box, { backgroundColor: tone.bg }]}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Icon name="wifiOff" size={18} tint={tone.fg} />
        <View style={styles.text}>
          {lines.map((line) => (
            <AppText key={line} variant="bodyStrong" style={{ color: tone.fg }}>
              {line}
            </AppText>
          ))}
          {waiting > 0 && (
            <AppText variant="caption" style={{ color: tone.fg }}>
              {es.outbox.bannerHint}
            </AppText>
          )}
        </View>
      </View>
      {waiting > 0 && (
        <View style={styles.action}>
          <Button
            label={outbox.sending ? es.outbox.sending : es.outbox.sendNow}
            variant="secondary"
            loading={outbox.sending}
            onPress={() => void outbox.sendNow()}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.control,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  text: { flex: 1, gap: spacing.xxs },
  action: { alignItems: 'flex-start' },
});
