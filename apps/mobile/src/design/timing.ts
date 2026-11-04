/**
 * Duraciones de las animaciones pequeñas (especificación 006): de 150 a 300 ms. Con
 * «Quitar animaciones» o «reducir movimiento», duran 0 y todo aparece en su sitio.
 */
export const DURATION = { fast: 150, base: 200, slow: 300 } as const;

export function duration(ms: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : ms;
}
