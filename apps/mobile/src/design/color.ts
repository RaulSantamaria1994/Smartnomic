/**
 * Utilidades de color del sistema de diseño (especificación 003). Trabajan con colores
 * `#RRGGBB`, que es como se guardan las categorías.
 */
const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function parse(hex: string): [number, number, number] {
  const match = HEX.exec(hex);
  if (!match) throw new RangeError(`Color no válido: «${hex}»`);
  return [1, 2, 3].map((i) => parseInt(match[i]!, 16)) as [number, number, number];
}

function format(rgb: number[]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** `from` mezclado con `to`: 0 es `from` y 1 es `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = parse(from);
  const b = parse(to);
  return format(a.map((v, i) => v + (b[i]! - v) * amount));
}

/** Versión suave de un color para fondos: `amount` de color y el resto de blanco. */
export function tint(hex: string, amount = 0.14): string {
  return mix('#FFFFFF', hex, amount);
}

function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG 2.1 entre dos colores (de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
