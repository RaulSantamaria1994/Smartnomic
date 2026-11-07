-- Especificación 013: una persona puede ser miembro de varios hogares, una vez en cada uno.
-- Se añade antes de quitar (constitución, art. IV.3).
CREATE UNIQUE INDEX "members_household_user_unique" ON "members" USING btree ("household_id","user_id");--> statement-breakpoint
CREATE INDEX "members_user_id_idx" ON "members" USING btree ("user_id");--> statement-breakpoint
DROP INDEX "members_user_id_unique";
