import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Tokens del estilo Android estándar (especificación 006, que sustituye a «Calma» de la
 * 003): fondo blanco, verde de la app para la barra superior y lo activo, separadores
 * grises y color solo para lo que pide atención. Las pantallas usan los nombres
 * semánticos (`color.text.muted`), nunca la paleta ni valores sueltos.
 */
export const palette = {
  green900: '#0E5A4C',
  green100: '#D7EBE5',
  greenMist: '#CFE6DF',
  green300: '#9CC9BE',
  greenTrack: '#DCE6E3',
  white: '#FFFFFF',
  grey50: '#F1F3F4',
  grey300: '#E0E0E0',
  grey600: '#757575',
  grey700: '#5F6368',
  ink: '#1F1F1F',
  income: '#1E7A3C',
  incomeDeep: '#1E6A35',
  incomeSoft: '#E6F2EA',
  amber: '#C2410C',
  amberDeep: '#9A4A0A',
  amberSoft: '#FDF1E3',
  /** Barra «cerca del límite»: decorativa, el texto de al lado dice el estado. */
  amberBar: '#E39B17',
  red: '#B3261E',
  redDeep: '#A8231B',
  redSoft: '#FDECEA',
  stone: '#8A948F',
} as const;

export const color = {
  bg: {
    canvas: palette.white,
    surface: palette.white,
    sunken: palette.grey50,
    accent: palette.green900,
    accentSoft: palette.green100,
    accentTint: palette.green100,
    danger: palette.redSoft,
  },
  text: {
    primary: palette.ink,
    muted: palette.grey700,
    placeholder: palette.grey600,
    link: palette.green900,
    onAccent: palette.white,
    onAccentMuted: palette.greenMist,
    /** Acción del aviso oscuro de deshacer. */
    onDarkAction: palette.green300,
    accent: palette.green900,
    danger: palette.red,
    success: palette.income,
  },
  border: {
    default: palette.grey300,
    soft: palette.grey300,
    strong: palette.grey600,
    focus: palette.green900,
    accent: palette.green900,
  },
  amount: { income: palette.income, expense: palette.ink },
  /** Estados de los vencimientos y huchas: texto de color, sin fondo (RF-604). */
  status: {
    overdue: palette.redDeep,
    soon: palette.amberDeep,
    pending: palette.grey700,
    paid: palette.incomeDeep,
    skipped: palette.grey700,
  },
  /** Fondos de los avisos y mensajes, con su texto. */
  notice: {
    danger: { fg: palette.redDeep, bg: palette.redSoft },
    warning: { fg: palette.amberDeep, bg: palette.amberSoft },
    success: { fg: palette.incomeDeep, bg: palette.incomeSoft },
  },
  /** Puntos del calendario y avisos. */
  mark: { overdue: palette.red, pending: palette.amber, resolved: palette.stone },
  progress: {
    track: palette.greenTrack,
    fill: palette.green900,
    near: palette.amberBar,
    over: palette.red,
  },
  /**
   * Barras de las gráficas (especificación 008). Ingresos y gastos llevan el color de sus
   * importes (verde de ingresos y tinta); el resto, el verde de la app. Decorativas: cada
   * barra va con su etiqueta y su importe en texto. Los gastos van en tinta y no en gris para
   * que se distingan del verde por luminosidad y no solo por el matiz.
   */
  chart: {
    track: palette.grey50,
    fill: palette.green900,
    income: palette.income,
    expense: palette.ink,
  },
  /** Fondo del aviso de deshacer, que flota sobre todo. */
  snackbar: palette.ink,
  /** Interruptor activado: pista y mando. */
  switch: { track: palette.green900, thumb: palette.white },
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

/** Fuente del sistema (RF-602): Roboto en Android y la del sistema en el navegador. */
function type(fontSize: number, lineHeight: number, weight: '400' | '500'): TextStyle {
  return { fontSize, lineHeight, fontWeight: weight };
}

export const typography = {
  display: type(34, 40, '500'),
  headline: type(22, 28, '500'),
  title: type(20, 26, '500'),
  heading: type(16, 24, '500'),
  bodyStrong: type(16, 22, '500'),
  body: type(16, 22, '400'),
  label: type(14, 20, '500'),
  caption: type(14, 20, '400'),
  small: type(13, 18, '400'),
  tab: type(12, 16, '500'),
  amountLarge: type(28, 34, '500'),
  amount: type(16, 22, '500'),
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

export const spacing = { xxs: 2, xs: 4, sm: 8, ms: 12, md: 16, ml: 20, lg: 24, xl: 32 } as const;

/** Esquinas: 4 px en botones y campos, 8 px en chips, 16 px en el botón flotante. */
export const radius = { control: 4, chip: 8, fab: 16, pill: 999 } as const;

/** Tamaños mínimos: objetivos táctiles de 44 px (WCAG). */
export const size = {
  touch: 44,
  button: 44,
  appBar: 64,
  fab: 56,
  icon: 24,
  iconSmall: 18,
  avatar: 40,
  categoryGlyph: 24,
  categoryGlyphLarge: 28,
} as const;

/** Solo lo que flota (botón «+», aviso de deshacer) lleva sombra. */
export const shadow = {
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
