/** Hogares de los que una persona puede ser miembro a la vez (especificación 013, RF-1301). */
export const MAX_HOUSEHOLDS = 5;

/**
 * El hogar que muestra la app: el último elegido en el dispositivo si la persona sigue siendo
 * miembro de él; si no (la quitaron, salió o lo borró), el primero de su lista; sin hogares,
 * ninguno (la app pide crear uno o unirse, RF-1308).
 */
export function activeHousehold<T extends { household: { id: string } }>(
  households: readonly T[],
  storedId: string | null | undefined,
): T | null {
  return households.find((h) => h.household.id === storedId) ?? households[0] ?? null;
}
