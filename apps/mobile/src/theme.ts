import { color, spacing as designSpacing } from './design/tokens';

/**
 * Nombres antiguos de color y espaciado, ahora sobre los tokens de `src/design/tokens.ts`
 * (especificación 003). Se quitan cuando todas las pantallas usen los tokens.
 */
export const colors = {
  background: color.bg.canvas,
  surface: color.bg.surface,
  text: color.text.primary,
  muted: color.text.muted,
  border: color.border.strong,
  primary: color.text.link,
  onPrimary: color.text.onAccent,
  error: color.text.danger,
  success: color.text.success,
} as const;

export const spacing = {
  xs: designSpacing.xs,
  sm: designSpacing.sm,
  md: designSpacing.md,
  lg: designSpacing.lg,
  xl: designSpacing.xl,
} as const;
