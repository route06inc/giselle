import {
	db,
	subscriptions,
	supabaseUserMappings,
	teamMemberships,
	teams,
	users,
} from "@/drizzle";
import { and, eq } from "drizzle-orm";

export const retrieveActiveStripeSubscriptionBySupabaseUserId = async (
	supabaseUserId: string,
) => {
	// ~TODO~: When team plans are released, a user may belong to multiple teams, so we need to handle that case.
	// One supabase user can have multiple teams which have pro plan subscription.
	// WON'T FIX: This method will be deprecated after pro plan is released.
	const [subscription] = await db
		.selectDistinct({ id: subscriptions.id })
		.from(subscriptions)
		.innerJoin(teams, eq(teams.dbId, subscriptions.teamDbId))
		.innerJoin(teamMemberships, eq(teamMemberships.teamDbId, teams.dbId))
		.innerJoin(users, eq(users.dbId, teamMemberships.userDbId))
		.innerJoin(
			supabaseUserMappings,
			eq(supabaseUserMappings.userDbId, users.dbId),
		)
		.where(
			and(
				eq(supabaseUserMappings.supabaseUserId, supabaseUserId),
				eq(subscriptions.status, "active"),
			),
		);
	return subscription;
};
