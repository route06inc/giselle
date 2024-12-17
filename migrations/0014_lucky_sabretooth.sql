ALTER TABLE "agents" ADD COLUMN "creator_db_id" integer;

-- Set default values for existing records (using user ID of the first team member for each agent)
WITH first_members AS (
  SELECT DISTINCT ON (team_db_id)
    team_db_id, user_db_id
    FROM team_memberships
    ORDER BY team_db_id, id ASC
)
UPDATE agents SET creator_db_id = first_members.user_db_id FROM first_members WHERE agents.team_db_id = first_members.team_db_id;

ALTER TABLE "agents" ALTER COLUMN "creator_db_id" SET NOT NULL;

DO $$ BEGIN
 ALTER TABLE "agents" ADD CONSTRAINT "agents_creator_db_id_users_db_id_fk" FOREIGN KEY ("creator_db_id") REFERENCES "public"."users"("db_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
