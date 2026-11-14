import { DEFAULT_TIMEZONE } from '@smartnomic/api';
import { and, eq } from 'drizzle-orm';
import type { Database } from './db/client';
import { accounts, households, users } from './db/schema';
import { listMemberships } from './households';

/** Ventana en la que se puede aplicar la zona del dispositivo tras un alta con Google. */
export const SIGNUP_TIMEZONE_WINDOW_MS = 15 * 60 * 1000;

/** ¿La cuenta puede entrar con email y contraseña? (especificación 016). */
export async function userHasPassword(db: Database, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ password: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential')))
    .limit(1);
  return Boolean(row?.password);
}

/**
 * Si el usuario acaba de crearse, es propietario de un solo hogar y ese hogar sigue en
 * Madrid (el valor por defecto), escribe la zona del dispositivo (RF-002 con Google).
 */
export async function applySignupTimezone(
  db: Database,
  userId: string,
  timezone: string,
  now: Date,
): Promise<void> {
  const memberships = await listMemberships(db, userId);
  if (memberships.length !== 1) return;
  const { household, member } = memberships[0]!;
  if (member.role !== 'owner' || household.timezone !== DEFAULT_TIMEZONE) return;
  const [user] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || now.getTime() - user.createdAt.getTime() > SIGNUP_TIMEZONE_WINDOW_MS) return;
  await db.update(households).set({ timezone }).where(eq(households.id, household.id));
}
