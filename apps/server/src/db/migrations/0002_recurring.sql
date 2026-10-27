CREATE TYPE "public"."frequency" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."occurrence_status" AS ENUM('paid', 'skipped');--> statement-breakpoint
CREATE TABLE "occurrences" (
	"recurring_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"status" "occurrence_status" NOT NULL,
	"transaction_id" uuid,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "occurrences_pkey" PRIMARY KEY("recurring_id","due_date"),
	CONSTRAINT "occurrences_skipped_check" CHECK ("occurrences"."status" = 'paid' OR "occurrences"."transaction_id" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"kind" "transaction_kind" NOT NULL,
	"name" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"category_id" uuid NOT NULL,
	"frequency" "frequency" NOT NULL,
	"interval" smallint DEFAULT 1 NOT NULL,
	"day_of_month" smallint,
	"month_of_year" smallint,
	"weekday" smallint,
	"start_date" date NOT NULL,
	"end_date" date,
	"remind_days_before" smallint DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_amount_check" CHECK ("recurring_rules"."amount_cents" > 0),
	CONSTRAINT "recurring_rules_name_check" CHECK (length(trim("recurring_rules"."name")) BETWEEN 1 AND 60),
	CONSTRAINT "recurring_rules_interval_check" CHECK ("recurring_rules"."interval" BETWEEN 1 AND 12),
	CONSTRAINT "recurring_rules_remind_check" CHECK ("recurring_rules"."remind_days_before" IN (0, 1, 3, 7)),
	CONSTRAINT "recurring_rules_end_check" CHECK ("recurring_rules"."end_date" IS NULL OR "recurring_rules"."end_date" >= "recurring_rules"."start_date"),
	CONSTRAINT "recurring_rules_days_check" CHECK (("recurring_rules"."frequency" = 'weekly' AND "recurring_rules"."weekday" BETWEEN 0 AND 6 AND "recurring_rules"."day_of_month" IS NULL AND "recurring_rules"."month_of_year" IS NULL)
        OR ("recurring_rules"."frequency" = 'monthly' AND "recurring_rules"."day_of_month" BETWEEN 1 AND 31 AND "recurring_rules"."weekday" IS NULL AND "recurring_rules"."month_of_year" IS NULL)
        OR ("recurring_rules"."frequency" = 'yearly' AND "recurring_rules"."day_of_month" BETWEEN 1 AND 31 AND "recurring_rules"."month_of_year" BETWEEN 1 AND 12 AND "recurring_rules"."weekday" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_recurring_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_id") REFERENCES "public"."recurring_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_resolved_by_members_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_fk" FOREIGN KEY ("category_id","household_id","kind") REFERENCES "public"."categories"("id","household_id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_rules_household_idx" ON "recurring_rules" USING btree ("household_id");