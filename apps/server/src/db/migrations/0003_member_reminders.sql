ALTER TABLE "members" ADD COLUMN "reminders_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "reminder_time" text DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_reminder_time_check" CHECK ("members"."reminder_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');