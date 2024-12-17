CREATE TABLE IF NOT EXISTS "agent_activities" (
	"db_id" serial PRIMARY KEY NOT NULL,
	"agent_db_id" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"total_duration_ms" integer NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_activities" ADD CONSTRAINT "agent_activities_agent_db_id_agents_db_id_fk" FOREIGN KEY ("agent_db_id") REFERENCES "public"."agents"("db_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_activities_agent_db_id_index" ON "agent_activities" USING btree ("agent_db_id");