import { ROLES } from '@smartnomic/domain';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Instantes en UTC (constitución, art. III.3).
const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const createdAt = () => instant('created_at').notNull().defaultNow();
const updatedAt = () =>
  instant('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------------------
// Tablas de Better Auth. Los nombres de campo son los que espera su adaptador de Drizzle.
// ---------------------------------------------------------------------------------------

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: instant('expires_at').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: instant('access_token_expires_at'),
    refreshTokenExpiresAt: instant('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: instant('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

// ---------------------------------------------------------------------------------------
// Hogares y miembros (especificación 001, RF-002 a RF-008).
// ---------------------------------------------------------------------------------------

export const households = pgTable(
  'households',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    currency: text('currency').notNull().default('EUR'),
    monthStartDay: smallint('month_start_day').notNull().default(1),
    timezone: text('timezone').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    check('households_month_start_day_check', sql`${table.monthStartDay} BETWEEN 1 AND 28`),
    check('households_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const memberRole = pgEnum('member_role', ROLES);

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    joinedAt: instant('joined_at').notNull().defaultNow(),
  },
  (table) => [
    // Un usuario pertenece a un solo hogar en el MVP (RF-008).
    uniqueIndex('members_user_id_unique').on(table.userId),
    // Exactamente un propietario por hogar.
    uniqueIndex('members_one_owner_per_household')
      .on(table.householdId)
      .where(sql`${table.role} = 'owner'`),
    index('members_household_id_idx').on(table.householdId),
  ],
);
