import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Tokens del sistema de diseño «Calma» (especificación 003): verde pino de confianza,
 * fondo arena cálido y color solo para lo que pide atención. Las pantallas usan los
 * nombres semánticos (`color.text.muted`), nunca la paleta ni valores sueltos, para poder
 * añadir un modo oscuro sin tocarlas.
 */
export const palette = {
  pine900: '#0E5A4C',
  pine700: '#0E6E5C',
  pine100: '#D7EBE5',
  pine50: '#EAF4F1',
  pineMist: '#CFE6DF',
  sand: '#F6F4EF',
  sandDeep: '#ECE8DF',
  white: '#FFFFFF',
  ink: '#15201E',
  inkMuted: '#56625F',
  line: '#E2DED5',
  lineSoft: '#EEEBE4',
  lineStrong: '#8C8576',
  green: '#1E7A3C',
  greenDeep: '#1E6A35',
  greenSoft: '#E6F2EA',
  amber: '#C2410C',
  amberDeep: '#9A4A0A',
  amberSoft: '#FDF1E3',
  red: '#B3261E',
  redDeep: '#A8231B',
  redSoft: '#FDECEA',
  stone: '#8A948F',
  stoneDeep: '#4A5551',
  stoneSoft: '#ECEEED',
  honey: '#F3C77A',
} as const;

export const color = {
  bg: {
    canvas: palette.sand,
    surface: palette.white,
    sunken: palette.sandDeep,
    accent: palette.pine900,
    accentSoft: palette.pine50,
    accentTint: palette.pine100,
    danger: palette.redSoft,
  },
  text: {
    primary: palette.ink,
    muted: palette.inkMuted,
    link: palette.pine700,
    onAccent: palette.white,
    onAccentMuted: palette.pineMist,
    accent: palette.pine900,
    danger: palette.red,
    success: palette.green,
  },
  border: {
    default: palette.line,
    soft: palette.lineSoft,
    strong: palette.lineStrong,
    focus: palette.pine700,
    accent: palette.pine900,
  },
  amount: { income: palette.green, expense: palette.ink },
  /** Etiquetas de estado: siempre texto y color juntos (RF-204). */
  status: {
    overdue: { fg: palette.redDeep, bg: palette.redSoft },
    soon: { fg: palette.amberDeep, bg: palette.amberSoft },
    pending: { fg: palette.stoneDeep, bg: palette.stoneSoft },
    paid: { fg: palette.greenDeep, bg: palette.greenSoft },
    skipped: { fg: palette.stoneDeep, bg: palette.stoneSoft },
  },
  /** Puntos del calendario y avisos. */
  mark: { overdue: palette.red, pending: palette.amber, resolved: palette.stone },
  progress: { track: 'rgba(255,255,255,0.18)', fill: palette.honey },
  overlay: { onAccent: 'rgba(255,255,255,0.10)' },
} as const;

/**
 * Colores que se pueden elegir para una categoría propia. Se guardan con la categoría;
 * por eso son datos y no tokens semánticos.
 */
export const categoryPalette = [
  { value: '#1F5FBF', name: 'Azul' },
  { value: '#2F7D32', name: 'Verde' },
  { value: '#C62828', name: 'Rojo' },
  { value: '#8E5A2B', name: 'Marrón' },
  { value: '#5E35B1', name: 'Morado' },
  { value: '#D81B60', name: 'Rosa' },
  { value: '#00838F', name: 'Turquesa' },
  { value: '#455A64', name: 'Gris' },
] as const;

/** Familias de Plus Jakarta Sans: en Android cada peso es una familia distinta. */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

function type(
  fontSize: number,
  lineHeight: number,
  family: keyof typeof fontFamily,
  letterSpacing = 0,
): TextStyle {
  return { fontSize, lineHeight, fontFamily: fontFamily[family], letterSpacing };
}

export const typography = {
  display: type(40, 48, 'extrabold', -1),
  headline: type(28, 34, 'bold', -0.5),
  title: type(22, 28, 'bold', -0.3),
  heading: type(17, 24, 'bold'),
  bodyStrong: type(16, 22, 'semibold'),
  body: type(16, 22, 'medium'),
  label: type(14, 20, 'semibold'),
  caption: type(14, 20, 'medium'),
  small: type(13, 18, 'semibold'),
  amountLarge: type(28, 34, 'extrabold', -0.5),
  amount: type(16, 22, 'bold'),
  /** Emoji de las categorías: sin familia propia, con la del sistema. */
  emoji: { fontSize: 22, lineHeight: 28 },
  emojiLarge: { fontSize: 26, lineHeight: 32 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const spacing = { xxs: 2, xs: 4, sm: 8, ms: 12, md: 16, ml: 20, lg: 24, xl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 } as const;

/** Tamaños mínimos: objetivos táctiles de 44 px (WCAG) y 48 px en botones. */
export const size = { touch: 44, button: 52, icon: 22, iconSmall: 18, avatar: 40 } as const;

export const shadow = {
  card: {
    shadowColor: palette.ink,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: palette.ink,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const satisfies Record<string, ViewStyle>;

/** Ancho máximo del contenido en pantallas anchas (navegador). */
export const layout = { maxWidth: 640, maxFormWidth: 480 } as const;
