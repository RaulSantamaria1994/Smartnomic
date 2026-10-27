import { FREQUENCIES, ROLES, TRANSACTION_KINDS } from '@smartnomic/domain';
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
  primaryKey,
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
    /** Este miembro recibe avisos de los vencimientos (RF-031). */
    remindersEnabled: boolean('reminders_enabled').notNull().default(true),
    /** Hora local `HH:MM` de sus avisos (RF-030). */
    reminderTime: text('reminder_time').notNull().default('09:00'),
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
    check(
      'members_reminder_time_check',
      sql`${table.reminderTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
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

// ---------------------------------------------------------------------------------------
// Pagos recurrentes y vencimientos (especificación 001, historia 2). Los vencimientos
// pendientes se calculan con el dominio; solo se guardan los pagados u omitidos.
// ---------------------------------------------------------------------------------------

export const frequency = pgEnum('frequency', FREQUENCIES);

export const recurringRules = pgTable(
  'recurring_rules',
  {
    /** UUIDv7 que genera la app: crear dos veces la misma regla no la duplica. */
    id: uuid('id').primaryKey(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    kind: transactionKind('kind').notNull(),
    name: text('name').notNull(),
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    categoryId: uuid('category_id').notNull(),
    frequency: frequency('frequency').notNull(),
    interval: smallint('interval').notNull().default(1),
    dayOfMonth: smallint('day_of_month'),
    monthOfYear: smallint('month_of_year'),
    weekday: smallint('weekday'),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    remindDaysBefore: smallint('remind_days_before').notNull().default(1),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      name: 'recurring_rules_category_fk',
      columns: [table.categoryId, table.householdId, table.kind],
      foreignColumns: [categories.id, categories.householdId, categories.kind],
    }).onDelete('no action'),
    check('recurring_rules_amount_check', sql`${table.amountCents} > 0`),
    check('recurring_rules_name_check', sql`length(trim(${table.name})) BETWEEN 1 AND 60`),
    check('recurring_rules_interval_check', sql`${table.interval} BETWEEN 1 AND 12`),
    check('recurring_rules_remind_check', sql`${table.remindDaysBefore} IN (0, 1, 3, 7)`),
    check(
      'recurring_rules_end_check',
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`,
    ),
    // Cada frecuencia usa sus campos de día y deja los demás vacíos.
    check(
      'recurring_rules_days_check',
      sql`(${table.frequency} = 'weekly' AND ${table.weekday} BETWEEN 0 AND 6 AND ${table.dayOfMonth} IS NULL AND ${table.monthOfYear} IS NULL)
        OR (${table.frequency} = 'monthly' AND ${table.dayOfMonth} BETWEEN 1 AND 31 AND ${table.weekday} IS NULL AND ${table.monthOfYear} IS NULL)
        OR (${table.frequency} = 'yearly' AND ${table.dayOfMonth} BETWEEN 1 AND 31 AND ${table.monthOfYear} BETWEEN 1 AND 12 AND ${table.weekday} IS NULL)`,
    ),
    index('recurring_rules_household_idx').on(table.householdId),
  ],
);

export const occurrenceStatus = pgEnum('occurrence_status', ['paid', 'skipped']);

export const occurrences = pgTable(
  'occurrences',
  {
    // Al borrar la regla se borran sus vencimientos; los movimientos se conservan (RF-027).
    recurringId: uuid('recurring_id')
      .notNull()
      .references(() => recurringRules.id, { onDelete: 'cascade' }),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    status: occurrenceStatus('status').notNull(),
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),
    resolvedBy: uuid('resolved_by').references(() => members.id, { onDelete: 'set null' }),
    resolvedAt: instant('resolved_at').notNull().defaultNow(),
  },
  (table) => [
    // Un vencimiento se resuelve una sola vez: dos pagos a la vez no crean dos gastos.
    primaryKey({ name: 'occurrences_pkey', columns: [table.recurringId, table.dueDate] }),
    check(
      'occurrences_skipped_check',
      sql`${table.status} = 'paid' OR ${table.transactionId} IS NULL`,
    ),
  ],
);

// ---------------------------------------------------------------------------------------
// Invitaciones (especificación 001, RF-004 y RF-005).
// ---------------------------------------------------------------------------------------

export const invitationStatus = pgEnum('invitation_status', ['pending', 'used', 'revoked']);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    /** Código para escribirlo o abrir el enlace. Sirve una sola vez. */
    code: text('code').notNull().unique(),
    status: invitationStatus('status').notNull().default('pending'),
    expiresAt: instant('expires_at').notNull(),
    createdBy: uuid('created_by').references(() => members.id, { onDelete: 'set null' }),
    usedBy: text('used_by').references(() => users.id, { onDelete: 'set null' }),
    usedAt: instant('used_at'),
    createdAt: createdAt(),
  },
  (table) => [
    // Se invita como editor o lector: la propiedad solo se transfiere.
    check('invitations_role_check', sql`${table.role} <> 'owner'`),
    index('invitations_household_idx').on(table.householdId),
  ],
);
