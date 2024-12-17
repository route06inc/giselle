import {
	db,
	subscriptions,
	supabaseUserMappings,
	teamMemberships,
	teams,
} from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { and, asc, eq } from "drizzle-orm";

/**
 * fetch teams for the current user
 */
export async function fetchUserTeams() {
	const user = await getUser();
	const records = await db
		.select({
			dbId: teams.dbId,
			name: teams.name,
			type: teams.type,
			activeSubscriptionId: subscriptions.id,
		})
		.from(teams)
		.innerJoin(teamMemberships, eq(teams.dbId, teamMemberships.teamDbId))
		.innerJoin(
			supabaseUserMappings,
			eq(teamMemberships.userDbId, supabaseUserMappings.userDbId),
		)
		.leftJoin(
			subscriptions,
			and(
				eq(subscriptions.teamDbId, teams.dbId),
				eq(subscriptions.status, "active"),
			),
		)
		.where(eq(supabaseUserMappings.supabaseUserId, user.id))
		.orderBy(asc(teams.dbId));
	if (records.length === 0) {
		throw new Error("User does not have a team");
	}
	return records;
}
