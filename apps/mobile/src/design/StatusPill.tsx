import { AppText } from './Text';
import { color } from './tokens';

export type PillKind = keyof typeof color.status;

/** Estado en texto de color, igual en todas las pantallas (RF-204, RF-604). */
export function StatusPill({ kind, label }: { kind: PillKind; label: string }) {
  return (
    <AppText variant="label" style={{ color: color.status[kind] }} numberOfLines={1}>
      {label}
    </AppText>
  );
}
