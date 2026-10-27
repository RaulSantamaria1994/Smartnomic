/**
 * UUID versión 7 (RFC 9562): 48 bits de milisegundos y 74 bits aleatorios. La hora y los
 * bytes aleatorios entran como parámetros: el dominio no lee el reloj ni genera azar.
 */
export function uuidV7(timestampMs: number, random: Uint8Array): string {
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0 || timestampMs >= 2 ** 48) {
    throw new RangeError(`Marca de tiempo no válida: ${timestampMs}`);
  }
  if (random.length < 10) throw new RangeError('Hacen falta al menos 10 bytes aleatorios');

  const bytes = new Uint8Array(16);
  let time = timestampMs;
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes.set(random.subarray(0, 10), 6);
  bytes[6] = 0x70 | (bytes[6]! & 0x0f); // versión 7
  bytes[8] = 0x80 | (bytes[8]! & 0x3f); // variante RFC

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
