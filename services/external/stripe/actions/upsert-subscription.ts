import { db, subscriptions, teamMemberships, teams } from "@/drizzle";
import {
	DRAFT_TEAM_NAME_METADATA_KEY,
	DRAFT_TEAM_USER_DB_ID_METADATA_KEY,
	UPGRADING_TEAM_DB_ID_KEY,
} from "@/services/teams/constants";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { stripe } from "../config";

const timestampToDateTime = (timestamp: number) => new Date(timestamp * 1000);

export const upsertSubscription = async (subscriptionId: string) => {
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);

	console.log("upsertSubscription");
	console.log("subscription.id", subscription.id);
	console.log("subscription.object", subscription.object);
	console.log("subscription.status", subscription.status);

	const existingSubscriptionRecord = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.id, subscription.id));

	if (existingSubscriptionRecord.length > 0) {
		await updateSubscription(subscription);
		return;
	}

	await activateProTeamSubscription(subscription);
};

async function activateProTeamSubscription(subscription: Stripe.Subscription) {
	const upgradingTeamDbIdKey = UPGRADING_TEAM_DB_ID_KEY;
	if (upgradingTeamDbIdKey in subscription.metadata) {
		const teamDbId = Number.parseInt(
			subscription.metadata[upgradingTeamDbIdKey],
			10,
		);
		await upgradeExistingTeam(subscription, teamDbId);
		return;
	}

	const draftTeamNameKey = DRAFT_TEAM_NAME_METADATA_KEY;
	const draftTeamUserDbIdKey = DRAFT_TEAM_USER_DB_ID_METADATA_KEY;
	if (
		draftTeamNameKey in subscription.metadata &&
		draftTeamUserDbIdKey in subscription.metadata
	) {
		const teamName = subscription.metadata[draftTeamNameKey];
		const userDbId = Number.parseInt(
			subscription.metadata[draftTeamUserDbIdKey],
			10,
		);
		await createNewProTeam(subscription, userDbId, teamName);
		return;
	}

	throw new Error("Invalid subscription metadata");
}

async function createNewProTeam(
	subscription: Stripe.Subscription,
	userDbId: number,
	teamName: string,
) {
	// wrap operations in a transaction to prevent duplicate team and membership creation
	await db.transaction(async (tx) => {
		const teamDbId = await createTeam(tx, userDbId, teamName);
		// if the race condition happens, inserting subscription will successfully raise because of the unique constraint.
		await insertSubscription(tx, subscription, teamDbId);
	});
}

async function upgradeExistingTeam(
	subscription: Stripe.Subscription,
	teamDbId: number,
) {
	await db.transaction(async (tx) => {
		const result = await tx
			.select({ dbId: teams.dbId })
			.from(teams)
			.for("update")
			.where(eq(teams.dbId, teamDbId));
		if (result.length !== 1) {
			throw new Error("Team not found");
		}
		const team = result[0];
		await insertSubscription(tx, subscription, team.dbId);
	});
}

// https://github.com/drizzle-team/drizzle-orm/issues/2851#issuecomment-2481083003
type TransactionType = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createTeam(
	tx: TransactionType,
	userDbId: number,
	teamName: string,
) {
	const [team] = await tx
		.insert(teams)
		.values({
			name: teamName,
		})
		.returning({ dbid: teams.dbId });

	await tx.insert(teamMemberships).values({
		teamDbId: team.dbid,
		userDbId,
		role: "admin",
	});

	return team.dbid;
}

async function insertSubscription(
	tx: TransactionType,
	subscription: Stripe.Subscription,
	teamDbId: number,
) {
	await tx.insert(subscriptions).values({
		id: subscription.id,
		teamDbId: teamDbId,
		status: subscription.status,
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
		cancelAt:
			subscription.cancel_at !== null
				? timestampToDateTime(subscription.cancel_at)
				: null,
		canceledAt:
			subscription.canceled_at !== null
				? timestampToDateTime(subscription.canceled_at)
				: null,
		currentPeriodStart: timestampToDateTime(subscription.current_period_start),
		currentPeriodEnd: timestampToDateTime(subscription.current_period_end),
		created: timestampToDateTime(subscription.created),
		endedAt:
			subscription.ended_at !== null
				? timestampToDateTime(subscription.ended_at)
				: null,
		trialStart:
			subscription.trial_start !== null
				? timestampToDateTime(subscription.trial_start)
				: null,
		trialEnd:
			subscription.trial_end !== null
				? timestampToDateTime(subscription.trial_end)
				: null,
	});
}

async function updateSubscription(subscription: Stripe.Subscription) {
	await db
		.update(subscriptions)
		.set({
			status: subscription.status,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			cancelAt:
				subscription.cancel_at !== null
					? timestampToDateTime(subscription.cancel_at)
					: null,
			canceledAt:
				subscription.canceled_at !== null
					? timestampToDateTime(subscription.canceled_at)
					: null,
			currentPeriodStart: timestampToDateTime(
				subscription.current_period_start,
			),
			currentPeriodEnd: timestampToDateTime(subscription.current_period_end),
			created: timestampToDateTime(subscription.created),
			endedAt:
				subscription.ended_at !== null
					? timestampToDateTime(subscription.ended_at)
					: null,
			trialStart:
				subscription.trial_start !== null
					? timestampToDateTime(subscription.trial_start)
					: null,
			trialEnd:
				subscription.trial_end !== null
					? timestampToDateTime(subscription.trial_end)
					: null,
		})
		.where(eq(subscriptions.id, subscription.id));
}
