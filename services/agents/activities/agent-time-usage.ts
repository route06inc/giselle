import { agentActivities, agents, db, subscriptions, teams } from "@/drizzle";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getMonthlyBillingCycle } from "./utils";

/**
 * Calculates the total agent time usage in milliseconds for a specific team during their current billing period.
 */
export async function calculateAgentTimeUsageMs(teamDbId: number) {
	const { start, end } = await getCurrentBillingPeriod(teamDbId);
	return await agentTimeUsageMs(teamDbId, start, end);
}

/**
 * get current billing period for a team
 * - Pro Team: use active subscription's current period start and end
 * - Free Team: use team's creation date as reference date and calculate monthly billing cycle
 * @param teamDbId
 */
async function getCurrentBillingPeriod(teamDbId: number) {
	const result = await db
		.select({
			dbId: teams.dbId,
			name: teams.name,
			type: teams.type,
			createdAt: teams.createdAt,
			activeSubscriptionId: subscriptions.id,
			activeSubscriptionCurrentPeriodStart: subscriptions.currentPeriodStart,
			activeSubscriptionCurrentPeriodEnd: subscriptions.currentPeriodEnd,
		})
		.from(teams)
		.leftJoin(
			subscriptions,
			and(
				eq(subscriptions.teamDbId, teams.dbId),
				eq(subscriptions.status, "active"),
			),
		)
		.where(and(eq(teams.dbId, teamDbId)));
	if (result.length === 0) {
		throw new Error(`Team not found: ${teamDbId}`);
	}
	if (result.length > 1) {
		throw new Error(`Multiple teams found: ${teamDbId}`);
	}
	const data = result[0];

	// has active subscription
	if (data.activeSubscriptionId != null) {
		if (
			data.activeSubscriptionCurrentPeriodStart == null ||
			data.activeSubscriptionCurrentPeriodEnd == null
		) {
			throw new Error(`Invalid subscription period: ${teamDbId}`);
		}
		return {
			start: data.activeSubscriptionCurrentPeriodStart,
			end: data.activeSubscriptionCurrentPeriodEnd,
		};
	}

	// Free plan team
	const referenceDate = data.createdAt;
	const currentDate = new Date();
	return getMonthlyBillingCycle(referenceDate, currentDate);
}

// Caluclate the time usage of an agent specified by the time range
async function agentTimeUsageMs(
	teamDbId: number,
	startedAt: Date,
	endedAt: Date,
) {
	const result = await db
		.select({
			value: sql<number>`sum(${agentActivities.totalDurationMs})`,
		})
		.from(agentActivities)
		.innerJoin(agents, eq(agents.dbId, agentActivities.agentDbId))
		.where(
			and(
				eq(agents.teamDbId, teamDbId),
				// half-open interval [startedAt, endedAt)
				and(
					gte(agentActivities.endedAt, startedAt),
					lt(agentActivities.endedAt, endedAt),
				),
			),
		);
	if (result.length === 0) {
		return 0;
	}
	return result[0].value;
}
