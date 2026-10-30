CREATE TYPE "public"."savings_entry_kind" AS ENUM('deposit', 'withdrawal', 'skip');--> statement-breakpoint
CREATE TABLE "savings_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"member_id" uuid,
	"kind" "savings_entry_kind" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"date" date NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "savings_entries_amount_check" CHECK (("savings_entries"."kind" = 'skip' AND "savings_entries"."amount_cents" = 0) OR ("savings_entries"."kind" <> 'skip' AND "savings_entries"."amount_cents" > 0)),
	CONSTRAINT "savings_entries_due_check" CHECK ("savings_entries"."kind" = 'deposit' OR ("savings_entries"."kind" = 'skip' AND "savings_entries"."due_date" IS NOT NULL) OR "savings_entries"."due_date" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"target_cents" bigint NOT NULL,
	"deadline" date NOT NULL,
	"contribution_day" smallint NOT NULL,
	"start_date" date NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_goals_id_household_unique" UNIQUE("id","household_id"),
	CONSTRAINT "savings_goals_target_check" CHECK ("savings_goals"."target_cents" > 0),
	CONSTRAINT "savings_goals_name_check" CHECK (length(trim("savings_goals"."name")) BETWEEN 1 AND 40),
	CONSTRAINT "savings_goals_day_check" CHECK ("savings_goals"."contribution_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
ALTER TABLE "savings_entries" ADD CONSTRAINT "savings_entries_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_entries" ADD CONSTRAINT "savings_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_entries" ADD CONSTRAINT "savings_entries_goal_fk" FOREIGN KEY ("goal_id","household_id") REFERENCES "public"."savings_goals"("id","household_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "savings_entries_due_unique" ON "savings_entries" USING btree ("goal_id","due_date") WHERE "savings_entries"."due_date" IS NOT NULL AND "savings_entries"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "savings_entries_household_date_idx" ON "savings_entries" USING btree ("household_id","date");--> statement-breakpoint
CREATE INDEX "savings_entries_goal_idx" ON "savings_entries" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "savings_goals_household_idx" ON "savings_goals" USING btree ("household_id");