import { Text, type TextProps } from 'react-native';
import { color, typography, type TypographyVariant } from './tokens';

type Tone = keyof typeof color.text;

interface Props extends TextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  /** Cifras del mismo ancho, para que los importes se alineen. */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
}

/** Texto con la escala tipográfica y los colores del sistema de diseño. */
export function AppText({
  variant = 'body',
  tone = 'primary',
  tabular,
  align,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: color.text[tone] },
        tabular && { fontVariant: ['tabular-nums'] },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
