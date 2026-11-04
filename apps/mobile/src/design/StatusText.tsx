import { AppText } from './Text';
import { color } from './tokens';

export type StatusKind = keyof typeof color.status;

/** Estado en texto de color, sin pastilla, igual en todas las pantallas (RF-204, RF-604). */
export function StatusText({ kind, label }: { kind: StatusKind; label: string }) {
  return (
    <AppText variant="caption" style={{ color: color.status[kind] }} numberOfLines={1}>
      {label}
    </AppText>
  );
}
