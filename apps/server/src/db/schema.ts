import { ROLES, TRANSACTION_KINDS } from '@smartnomic/domain';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
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

// ---------------------------------------------------------------------------------------
// Categorías y movimientos (especificación 001, historia 1).
// ---------------------------------------------------------------------------------------

export const transactionKind = pgEnum('transaction_kind', TRANSACTION_KINDS);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    kind: transactionKind('kind').notNull(),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    /** Orden en que se muestran dentro de su tipo. */
    position: smallint('position').notNull().default(0),
    archivedAt: instant('archived_at'),
    createdAt: createdAt(),
  },
  (table) => [
    // Destino de la clave compuesta de `transactions`: misma categoría, hogar y tipo.
    unique('categories_id_household_kind_unique').on(table.id, table.householdId, table.kind),
    // Sin nombres repetidos por hogar y tipo entre las categorías en uso.
    uniqueIndex('categories_active_name_unique')
      .on(table.householdId, table.kind, sql`lower(${table.name})`)
      .where(sql`${table.archivedAt} IS NULL`),
    check('categories_name_check', sql`length(trim(${table.name})) BETWEEN 1 AND 40`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    /** UUIDv7 que genera la app, para que reenviar no duplique (art. V.5). */
    id: uuid('id').primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    kind: transactionKind('kind').notNull(),
    // Céntimos enteros (art. III.1). `number` es exacto hasta 2^53, muy por encima del máximo.
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    categoryId: uuid('category_id').notNull(),
    /** Quién lo apuntó. Queda vacío si esa persona sale del hogar. */
    memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: instant('deleted_at'),
  },
  (table) => [
    foreignKey({
      name: 'transactions_category_fk',
      columns: [table.categoryId, table.householdId, table.kind],
      foreignColumns: [categories.id, categories.householdId, categories.kind],
    }).onDelete('no action'),
    check('transactions_amount_check', sql`${table.amountCents} > 0`),
    check('transactions_note_check', sql`${table.note} IS NULL OR length(${table.note}) <= 500`),
    index('transactions_household_date_idx').on(table.householdId, table.date),
  ],
);
