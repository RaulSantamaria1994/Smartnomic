/**
 * Compara dos emails como los escribe una persona: sin espacios alrededor y sin distinguir
 * mayúsculas (especificación 016, RF-1609).
 */
export function emailsMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}
