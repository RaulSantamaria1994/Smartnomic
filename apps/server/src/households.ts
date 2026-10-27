import { DEFAULT_TIMEZONE, timeZoneSchema } from '@smartnomic/api';
import { eq, TransactionRollbackError } from 'drizzle-orm';
import type { Database } from './db/client';
import { households, members } from './db/schema';

export type HouseholdRow = typeof households.$inferSelect;
export type MemberRow = typeof members.$inferSelect;

export interface Membership {
  household: HouseholdRow;
  member: MemberRow;
}

export async function findMembership(db: Database, userId: string): Promise<Membership | null> {
  const [row] = await db
    .select({ household: households, member: members })
    .from(members)
    .innerJoin(households, eq(households.id, members.householdId))
    .where(eq(members.userId, userId))
    .limit(1);
  return row ?? null;
}

/**
 * Devuelve el hogar del usuario y, si aún no tiene, le crea uno del que es propietario
 * (especificación 001, RF-002). Es idempotente: se puede llamar a la vez desde el registro
 * y desde `GET /api/me` sin crear dos hogares.
 */
export async function ensureHousehold(
  db: Database,
  user: { id: string; name: string },
  timezone: string | null | undefined,
): Promise<Membership> {
  const existing = await findMembership(db, user.id);
  if (existing) return existing;

  const zone = timeZoneSchema.safeParse(timezone).success ? (timezone as string) : DEFAULT_TIMEZONE;
  const created = await db
    .transaction(async (tx) => {
      const [household] = await tx
        .insert(households)
        .values({ name: householdName(user.name), timezone: zone })
        .returning();
      if (!household) throw new Error('No se pudo crear el hogar');
      const [member] = await tx
        .insert(members)
        .values({ householdId: household.id, userId: user.id, role: 'owner' })
        // Otro proceso lo ha creado a la vez: se deshace este hogar y se usa el suyo.
        .onConflictDoNothing({ target: members.userId })
        .returning();
      if (!member) {
        tx.rollback();
        return null;
      }
      return { household, member };
    })
    .catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) return null;
      throw error;
    });

  if (created) return created;
  const membership = await findMembership(db, user.id);
  if (!membership) throw new Error('El usuario no tiene hogar');
  return membership;
}

function householdName(userName: string): string {
  const name = userName.trim();
  return name ? `Hogar de ${name}` : 'Mi hogar';
}
