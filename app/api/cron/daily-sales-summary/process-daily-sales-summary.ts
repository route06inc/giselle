import {
	agentActivities,
	agents,
	db,
	subscriptions,
	teams,
	userSeatUsageReports,
} from "@/drizzle";
import { stripe } from "@/services/external/stripe";
import { createObjectCsvStringifier } from "csv-writer";
import { and, eq, gte, lt } from "drizzle-orm";
import type Stripe from "stripe";
import invariant from "tiny-invariant";
import {
	formatAgentTimeUsageEvicence,
	formatSubscriptionEvidence,
	formatUserSeatEvidence,
} from "./formatter";
import { putCSV } from "./put-csv";
import type {
	SubscriptionCreateInvoiceEvidence,
	SubscriptionCycleInvoiceEvidence,
} from "./types";

/**
 * Process daily sales summary for the target date
 *
 * @param targetDate - Date object set to 00:00:00 UTC
 */
export async function processDailySalesSummary(targetDate: Date) {
	// fetch invoices created on the target date
	const periodStart = targetDate.getTime() / 1000;
	const periodEnd = targetDate.getTime() / 1000 + 24 * 60 * 60;
	const invoices = await fetchInvoices(periodStart, periodEnd);

	const evidences: (
		| SubscriptionCreateInvoiceEvidence
		| SubscriptionCycleInvoiceEvidence
	)[] = [];

	for (const invoice of invoices) {
		const evidence = await collectEvidence(invoice);
		evidences.push(evidence);
	}

	const targetDateString = targetDate.toISOString().split("T")[0];
	const outputPath = `daily-sales-summary/${targetDate.getUTCFullYear()}-${targetDate.getUTCMonth() + 1}`;

	// output Evidences
	const subscriptionEvidences = evidences.map((it) =>
		formatSubscriptionEvidence(it),
	);
	if (subscriptionEvidences.length > 0) {
		const csvStringifier = createObjectCsvStringifier({
			header: [
				{ id: "invoiceId", title: "Invoice ID" },
				{ id: "invoiceCreatedAt", title: "Invoice Created At" },
				{ id: "subscriptionId", title: "Subscription ID" },
				{ id: "teamDbId", title: "Team DB ID" },
				{ id: "teamName", title: "Team Name" },
			],
		});
		putCSV(
			`${outputPath}/${targetDateString}-subscriptions.csv`,
			csvStringifier.getHeaderString() ?? "",
			csvStringifier.stringifyRecords(subscriptionEvidences),
		);
	}

	const agentTimeUsageEvidences = evidences
		.filter((it) => it.kind === "subscription_cycle")
		.map((it) => formatAgentTimeUsageEvicence(it));
	if (agentTimeUsageEvidences.length > 0) {
		const csvStringifier = createObjectCsvStringifier({
			header: [
				{ id: "invoiceId", title: "Invoice ID" },
				{ id: "agentDbId", title: "Agent DB ID" },
				{ id: "agentName", title: "Agent Name" },
				{ id: "startedAt", title: "Started At" },
				{ id: "endedAt", title: "Ended At" },
				{ id: "totalDurationMs", title: "Total Duration (ms)" },
			],
		});
		putCSV(
			`${outputPath}/${targetDateString}-agent-time-usages.csv`,
			csvStringifier.getHeaderString() ?? "",
			csvStringifier.stringifyRecords(agentTimeUsageEvidences),
		);
	}

	const userSeatEvidences = evidences
		.filter((it) => it.kind === "subscription_cycle")
		.map((it) => formatUserSeatEvidence(it));
	if (userSeatEvidences.length > 0) {
		const csvStringifier = createObjectCsvStringifier({
			header: [
				{ id: "invoiceId", title: "Invoice ID" },
				{ id: "userDbId", title: "User DB ID" },
			],
		});
		putCSV(
			`${outputPath}/${targetDateString}-user-seats.csv`,
			csvStringifier.getHeaderString() ?? "",
			csvStringifier.stringifyRecords(userSeatEvidences),
		);
	}
}

async function fetchInvoices(
	periodStart: number,
	periodEnd: number,
): Promise<Stripe.Invoice[]> {
	const res = await stripe.invoices.list({
		created: {
			gte: periodStart,
			lt: periodEnd,
		},
		limit: 100,
	});
	if (res.has_more) {
		throw new Error("Too many invoices to process");
	}
	return res.data;
}

async function collectEvidence(
	invoice: Stripe.Invoice,
): Promise<
	SubscriptionCreateInvoiceEvidence | SubscriptionCycleInvoiceEvidence
> {
	invariant(invoice.subscription, "Subscription ID is required");
	const subscriptionId =
		typeof invoice.subscription === "string"
			? invoice.subscription
			: invoice.subscription.id;
	const res = await db
		.select({ teamDbId: teams.dbId, teamName: teams.name })
		.from(teams)
		.innerJoin(subscriptions, eq(teams.dbId, subscriptions.teamDbId))
		.where(eq(subscriptions.id, subscriptionId));
	if (res.length === 0) {
		throw new Error(`Team not found for subscription: ${subscriptionId}`);
	}
	const team = res[0];

	switch (invoice.billing_reason) {
		case "subscription_create":
			return {
				kind: "subscription_create",
				invoiceId: invoice.id,
				invoiceCreatedAt: toUTCDate(invoice.created),
				subscriptionId,
				teamDbId: team.teamDbId,
				teamName: team.teamName,
			};

		case "subscription_cycle": {
			// fetch invoice items
			// - user seat
			// - agent time usage
			const periodStartDate = toUTCDate(invoice.period_start);
			const periodEndDate = toUTCDate(invoice.period_end);

			const userSeats = await fetchUserSeats(
				team.teamDbId,
				periodStartDate,
				periodEndDate,
			);
			const userSeatEvidences = userSeats.map((userDbId) => ({
				invoiceId: invoice.id,
				userDbId,
			}));

			const agentTimeUsages = await fetchAgentTimeUsages(
				team.teamDbId,
				periodStartDate,
				periodEndDate,
			);
			const agentTimeUsageEvidences = agentTimeUsages.map((usage) => ({
				invoiceId: invoice.id,
				agentDbId: usage.agentDbId,
				agentName: usage.agentName ?? "",
				startedAt: usage.startedAt,
				endedAt: usage.endedAt,
				totalDurationMs: safeStringToNumber(usage.totalDurationMs),
			}));

			// TODO: reconcile with user seat and agent time usage

			return {
				kind: "subscription_cycle",
				invoiceId: invoice.id,
				invoiceCreatedAt: toUTCDate(invoice.created),
				subscriptionId,
				teamDbId: team.teamDbId,
				teamName: team.teamName,
				agentTimeUsages: agentTimeUsageEvidences,
				userSeats: userSeatEvidences,
			};
		}

		default:
			throw new Error(`Unsupported billing reason: ${invoice.billing_reason}`);
	}
}

async function fetchUserSeats(
	teamDbId: number,
	periodStartDate: Date,
	periodEndDate: Date,
) {
	const res = await db
		.select({
			userDbIdList: userSeatUsageReports.userDbIdList,
		})
		.from(userSeatUsageReports)
		.where(
			and(
				eq(userSeatUsageReports.teamDbId, teamDbId),
				gte(userSeatUsageReports.timestamp, periodStartDate),
				lt(userSeatUsageReports.timestamp, periodEndDate),
			),
		);
	if (res.length === 0) {
		throw new Error("No user seat usage report found");
	}
	return res[0].userDbIdList;
}

async function fetchAgentTimeUsages(
	teamDbId: number,
	periodStartDate: Date,
	periodEndDate: Date,
) {
	const res = await db
		.select({
			agentDbId: agentActivities.agentDbId,
			agentName: agents.name,
			startedAt: agentActivities.startedAt,
			endedAt: agentActivities.endedAt,
			totalDurationMs: agentActivities.totalDurationMs,
		})
		.from(agentActivities)
		.innerJoin(agents, eq(agentActivities.agentDbId, agents.dbId))
		.where(
			and(
				eq(agents.teamDbId, teamDbId),
				gte(agentActivities.endedAt, periodStartDate),
				lt(agentActivities.endedAt, periodEndDate),
			),
		);
	if (res.length === 0) {
		throw new Error("No agent activity found");
	}
	return res;
}

function toUTCDate(timestampSeconds: number): Date {
	const date = new Date(timestampSeconds * 1000);
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			date.getUTCHours(),
			date.getUTCMinutes(),
			date.getUTCSeconds(),
			date.getUTCMilliseconds(),
		),
	);
}

function safeStringToNumber(value: string): number {
	const num = Number(value);
	if (num > Number.MAX_SAFE_INTEGER) {
		throw new Error(`Value exceeds MAX_SAFE_INTEGER: ${value}`);
	}
	return num;
}
