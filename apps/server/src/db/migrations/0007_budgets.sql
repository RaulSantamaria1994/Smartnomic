CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"kind" "transaction_kind" DEFAULT 'expense' NOT NULL,
	"valid_from" date NOT NULL,
	"amount_cents" bigint,
	"member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_category_period_unique" UNIQUE("category_id","valid_from"),
	CONSTRAINT "budgets_kind_check" CHECK ("budgets"."kind" = 'expense'),
	CONSTRAINT "budgets_amount_check" CHECK ("budgets"."amount_cents" IS NULL OR "budgets"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_fk" FOREIGN KEY ("category_id","household_id","kind") REFERENCES "public"."categories"("id","household_id","kind") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budgets_household_idx" ON "budgets" USING btree ("household_id");