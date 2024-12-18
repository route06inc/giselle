import {
	db,
	subscriptions,
	teamMemberships,
	userSeatUsageReports,
} from "@/drizzle";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { stripe } from "../external/stripe";

const USER_SEAT_METER_NAME = "user_seat";
const PERIOD_END_BUFFER_MS = 1000 * 5; // 5 seconds

export async function reportUserSeatUsage(
	subscriptionId: string,
	customerId: string,
	periodEndUTC: Date,
) {
	const subscriptionRecord = await findSubscription(subscriptionId);
	const teamMembers = await listTeamMembers(subscriptionRecord.teamDbId);
	const currentMemberCount = teamMembers.length;
	const meterEventId = createId();

	// Must be with the subscrtipion period, so we subtract a buffer
	const timestamp = new Date(periodEndUTC.getTime() - PERIOD_END_BUFFER_MS);
	const stripeEvent = await stripe.v2.billing.meterEvents.create({
		event_name: USER_SEAT_METER_NAME,
		payload: {
			value: currentMemberCount.toString(),
			stripe_customer_id: customerId,
		},
		identifier: meterEventId,
		timestamp: timestamp.toISOString(),
	});

	// Save report to the database
	await saveUserSeatUsage(
		stripeEvent.identifier,
		subscriptionRecord.teamDbId,
		timestamp,
		teamMembers,
	);
}

async function saveUserSeatUsage(
	stripeMeterEventId: string,
	teamDbId: number,
	timestamp: Date,
	teamMembers: number[],
) {
	await db.insert(userSeatUsageReports).values({
		stripeMeterEventId,
		teamDbId,
		timestamp,
		userDbIdList: teamMembers,
	});
}

async function findSubscription(subscriptionId: string) {
	const record = await db
		.select({ dbid: subscriptions.dbId, teamDbId: subscriptions.teamDbId })
		.from(subscriptions)
		.where(eq(subscriptions.id, subscriptionId));
	if (record.length === 0) {
		throw new Error(`Subscription not found: ${subscriptionId}`);
	}
	return record[0];
}

async function listTeamMembers(teamDbId: number) {
	const teamMembers = await db
		.select({ userDbId: teamMemberships.userDbId })
		.from(teamMemberships)
		.where(eq(teamMemberships.teamDbId, teamDbId));
	return teamMembers.map((member) => member.userDbId);
}
