CREATE TABLE IF NOT EXISTS "agent_time_usage_reports" (
	"db_id" serial PRIMARY KEY NOT NULL,
	"team_db_id" integer NOT NULL,
	"accumulated_duration_ms" numeric NOT NULL,
	"minutes_increment" integer NOT NULL,
	"stripe_meter_event_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_activities" ALTER COLUMN "total_duration_ms" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "agent_activities" ADD COLUMN "usage_report_db_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_time_usage_reports" ADD CONSTRAINT "agent_time_usage_reports_team_db_id_teams_db_id_fk" FOREIGN KEY ("team_db_id") REFERENCES "public"."teams"("db_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_time_usage_reports_team_db_id_index" ON "agent_time_usage_reports" USING btree ("team_db_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_time_usage_reports_created_at_index" ON "agent_time_usage_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_time_usage_reports_stripe_meter_event_id_index" ON "agent_time_usage_reports" USING btree ("stripe_meter_event_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_usage_report_db_id_agent_time_usage_reports_db_id_fk" FOREIGN KEY ("usage_report_db_id") REFERENCES "public"."agent_time_usage_reports"("db_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
