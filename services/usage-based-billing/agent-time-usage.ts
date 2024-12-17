import { createId } from "@paralleldrive/cuid2";
import type Stripe from "stripe";
import { getMonthlyBillingCycle } from "../agents/activities";
import type { AgentTimeUsageDataAccess } from "./types";

const AGENT_TIME_USAGE_METER_NAME = "agent_time_charge";

/**
 * Pure function for calculating usage time
 */
export function calculateAgentTimeUsage(
	activities: { totalDurationMs: number }[],
	lastReport: {
		accumulatedDurationMs: number;
	} | null,
) {
	// Total duration of new activities (milliseconds)
	const newDurationMs = activities.reduce(
		(sum, activity) => sum + activity.totalDurationMs,
		0,
	);

	// Add new duration to the accumulated duration
	const accumulatedDurationMs =
		(lastReport?.accumulatedDurationMs ?? 0) + newDurationMs;

	// Convert milliseconds to minutes (round down)
	// If accumulatedDurationMs will over Number.MAX_SAFE_INTEGER, we should use Bigint but, we may not need to worry about it
	// Number.MAX_SAFE_INTEGER = 9007199254740991 = 104,249,991 days
	const totalMinutes = Math.floor(accumulatedDurationMs / 1000 / 60);

	const lastReportedTotalMinutes = Math.floor(
		(lastReport?.accumulatedDurationMs ?? 0) / 1000 / 60,
	);
	const minutesIncrement = totalMinutes - lastReportedTotalMinutes;

	return {
		accumulatedDurationMs,
		minutesIncrement,
	};
}

/**
 * Function to process unreported agent usage time for current period
 */
export async function processUnreportedActivities(
	params: {
		teamDbId: number;
		targetDate: Date;
	},
	deps: {
		dao: AgentTimeUsageDataAccess;
		stripe: Stripe;
	},
) {
	const { dao, stripe } = deps;

	const { subscriptionId, currentPeriodEnd, currentPeriodStart } =
		await dao.fetchCurrentSubscription(params.teamDbId);
	let periodStart = currentPeriodStart;
	let periodEnd = currentPeriodEnd;

	// If the billing cycle has just changed, we should process for the previous period
	if (params.targetDate < currentPeriodStart) {
		console.info(
			`Target date ${params.targetDate} is before the current period start ${currentPeriodStart}, process as last period`,
		);
		const { start, end } = getMonthlyBillingCycle(
			periodStart,
			params.targetDate,
		);
		periodStart = start;
		periodEnd = end;
	}

	let customerId: string;
	try {
		// FIXME: if we have customer id in subscriptions table, we can use it directly
		const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		customerId =
			typeof subscription.customer === "string"
				? subscription.customer
				: subscription.customer.id;
	} catch (error: unknown) {
		throw new Error(`Failed to retrieve subscription: ${error}`);
	}

	return await dao.transaction(async (tx) => {
		// Retrieve unprocessed activities in the current period
		const unprocessedActivities = await tx.findUnprocessedActivities(
			params.teamDbId,
			periodStart,
			periodEnd,
		);

		if (unprocessedActivities.length === 0) {
			return { processedReportId: null };
		}

		// Retrieve the latest report in the current period
		const lastReport = await tx.findLastUsageReport(
			params.teamDbId,
			periodStart,
			periodEnd,
		);

		// Calculate usage time
		const { accumulatedDurationMs, minutesIncrement } = calculateAgentTimeUsage(
			unprocessedActivities,
			lastReport,
		);

		// Do not report if the increment is less than 1 minute
		if (minutesIncrement < 1) {
			return { processedReportId: null };
		}

		const meterEventId = createId();

		// Use last unprocessed activity's endedAt as the Meter Event's timestamp
		const lastUnprocessedActivity = unprocessedActivities.at(-1);
		if (lastUnprocessedActivity == null) {
			throw new Error("lastUnprocessedActivity is null");
		}
		const timestamp = lastUnprocessedActivity.endedAt;

		// Report usage to Stripe
		const stripeEvent = await stripe.v2.billing.meterEvents.create({
			event_name: AGENT_TIME_USAGE_METER_NAME,
			payload: {
				value: minutesIncrement.toString(),
				stripe_customer_id: customerId,
			},
			identifier: meterEventId,
			timestamp: timestamp.toISOString(),
		});

		// Create usage report
		const report = await tx.createUsageReport({
			teamDbId: params.teamDbId,
			accumulatedDurationMs,
			minutesIncrement,
			stripeMeterEventId: stripeEvent.identifier,
			timestamp,
		});

		// Update activities
		await tx.markActivitiesAsProcessed(
			unprocessedActivities.map((a) => a.dbId),
			report.dbId,
		);

		return { processedReportId: report.dbId };
	});
}
