import { DEFAULT_TIMEZONE, timeZoneSchema } from '@smartnomic/api';
import { DEFAULT_CATEGORIES, MAX_HOUSEHOLDS } from '@smartnomic/domain';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { Database } from './db/client';
import { categories, households, members } from './db/schema';

export type HouseholdRow = typeof households.$inferSelect;
export type MemberRow = typeof members.$inferSelect;

export interface Membership {
  household: HouseholdRow;
  member: MemberRow;
}

/** La pertenencia del usuario a ese hogar, o `null` si no es miembro (especificación 013). */
export async function findMembership(
  db: Database,
  userId: string,
  householdId: string,
): Promise<Membership | null> {
  const [row] = await db
    .select({ household: households, member: members })
    .from(members)
    .innerJoin(households, eq(households.id, members.householdId))
    .where(and(eq(members.userId, userId), eq(members.householdId, householdId)))
    .limit(1);
  return row ?? null;
}

/** Los hogares del usuario, del más antiguo al más nuevo (por cuándo entró). */
export async function listMemberships(db: Database, userId: string): Promise<Membership[]> {
  return db
    .select({ household: households, member: members })
    .from(members)
    .innerJoin(households, eq(households.id, members.householdId))
    .where(eq(members.userId, userId))
    .orderBy(asc(members.joinedAt), asc(members.id));
}

/** El hogar más antiguo del usuario (lo que veía la app antes de varios hogares). */
export async function firstMembership(db: Database, userId: string): Promise<Membership | null> {
  return (await listMemberships(db, userId))[0] ?? null;
}

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Bloquea, hasta el final de la transacción, los cambios en los hogares de un usuario: así
 * dos peticiones a la vez no le llevan por encima del máximo (RF-1301).
 */
export async function lockUserHouseholds(tx: Tx, userId: string): Promise<number> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'households:' + userId}))`);
  const [row] = await tx.select({ total: count() }).from(members).where(eq(members.userId, userId));
  return row?.total ?? 0;
}

/**
 * Crea un hogar del que el usuario es propietario, con las categorías de siempre
 * (especificación 001, RF-002; 013, RF-1305). Con el máximo de hogares, `'limit'`.
 */
export async function createHousehold(
  db: Database,
  user: { id: string },
  options: { name: string; timezone: string | null | undefined; onlyIfNone?: boolean },
): Promise<Membership | 'limit' | 'exists'> {
  const zone = timeZoneSchema.safeParse(options.timezone).success
    ? (options.timezone as string)
    : DEFAULT_TIMEZONE;
  return db.transaction(async (tx) => {
    const total = await lockUserHouseholds(tx, user.id);
    if (options.onlyIfNone && total > 0) return 'exists';
    if (total >= MAX_HOUSEHOLDS) return 'limit';
    const [household] = await tx
      .insert(households)
      .values({ name: options.name, timezone: zone })
      .returning();
    if (!household) throw new Error('No se pudo crear el hogar');
    const [member] = await tx
      .insert(members)
      .values({ householdId: household.id, userId: user.id, role: 'owner' })
      .returning();
    if (!member) throw new Error('No se pudo crear el miembro');
    await tx.insert(categories).values(defaultCategoryRows(household.id));
    return { household, member };
  });
}

/**
 * Al registrarse: el primer hogar del usuario (RF-002, RF-1309). Si ya tiene alguno (el alta
 * se repite), no crea otro.
 */
export async function ensureHousehold(
  db: Database,
  user: { id: string; name: string },
  timezone: string | null | undefined,
): Promise<void> {
  await createHousehold(db, user, {
    name: householdName(user.name),
    timezone,
    onlyIfNone: true,
  });
}

function householdName(userName: string): string {
  const name = userName.trim();
  return name ? `Hogar de ${name}` : 'Mi hogar';
}

/**
 * Crea las categorías predefinidas si el hogar no tiene ninguna. Cubre los hogares
 * creados antes de que existieran las categorías.
 */
export async function ensureDefaultCategories(db: Database, householdId: string): Promise<void> {
  const [row] = await db
    .select({ total: count() })
    .from(categories)
    .where(eq(categories.householdId, householdId));
  if ((row?.total ?? 0) > 0) return;
  await db.insert(categories).values(defaultCategoryRows(householdId)).onConflictDoNothing();
}

function defaultCategoryRows(householdId: string) {
  return DEFAULT_CATEGORIES.map((category, position) => ({ ...category, householdId, position }));
}
