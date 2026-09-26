DROP INDEX "predictions_user_id_created_at_idx";--> statement-breakpoint
CREATE INDEX "predictions_user_id_created_at_idx" ON "predictions" USING btree ("user_id","created_at");