CREATE TABLE IF NOT EXISTS "user_seat_usage_reports" (
	"db_id" serial PRIMARY KEY NOT NULL,
	"team_db_id" integer NOT NULL,
	"user_db_id_list" integer[] NOT NULL,
	"stripe_meter_event_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_seat_usage_reports" ADD CONSTRAINT "user_seat_usage_reports_team_db_id_teams_db_id_fk" FOREIGN KEY ("team_db_id") REFERENCES "public"."teams"("db_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_seat_usage_reports_team_db_id_index" ON "user_seat_usage_reports" USING btree ("team_db_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_seat_usage_reports_created_at_index" ON "user_seat_usage_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_seat_usage_reports_stripe_meter_event_id_index" ON "user_seat_usage_reports" USING btree ("stripe_meter_event_id");