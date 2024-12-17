import {
	agentActivities,
	agentTimeUsageReports,
	agents,
	type db as drizzleDb,
	subscriptions,
} from "@/drizzle";
import { and, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import type {
	AgentActivity,
	AgentTimeUsageDataAccess,
	AgentTimeUsageReport,
} from "./types";

export class AgentTimeUsageDAO implements AgentTimeUsageDataAccess {
	constructor(private readonly db: typeof drizzleDb) {}

	async transaction<T>(
		fn: (dao: AgentTimeUsageDataAccess) => Promise<T>,
	): Promise<T> {
		return await this.db.transaction(async (tx) => {
			const transactionDao = new AgentTimeUsageDAO(tx);
			return await fn(transactionDao);
		});
	}

	async fetchCurrentSubscription(teamDbId: number) {
		const records = await this.db
			.select({
				id: subscriptions.id,
				currentPeriodStart: subscriptions.currentPeriodStart,
				currentPeriodEnd: subscriptions.currentPeriodEnd,
			})
			.from(subscriptions)
			.where(
				and(
					eq(subscriptions.teamDbId, teamDbId),
					eq(subscriptions.status, "active"),
				),
			)
			.limit(1);
		if (records.length === 0) {
			throw new Error(`No active subscription found for team ${teamDbId}`);
		}
		if (records.length > 1) {
			throw new Error(
				`Multiple active subscriptions found for team ${teamDbId}`,
			);
		}
		const currentSubscription = records[0];
		return {
			subscriptionId: currentSubscription.id,
			currentPeriodStart: currentSubscription.currentPeriodStart,
			currentPeriodEnd: currentSubscription.currentPeriodEnd,
		};
	}

	async findUnprocessedActivities(
		teamDbId: number,
		periodStart: Date,
		periodEnd: Date,
	): Promise<AgentActivity[]> {
		const activities = await this.db
			.select({
				dbId: agentActivities.dbId,
				totalDurationMs: agentActivities.totalDurationMs,
				endedAt: agentActivities.endedAt,
				usageReportDbId: agentActivities.usageReportDbId,
			})
			.from(agentActivities)
			.for("update")
			.innerJoin(agents, eq(agentActivities.agentDbId, agents.dbId))
			.where(
				and(
					eq(agents.teamDbId, teamDbId),
					isNull(agentActivities.usageReportDbId),
					gt(agentActivities.endedAt, periodStart),
					lte(agentActivities.endedAt, periodEnd),
				),
			)
			.orderBy(agentActivities.dbId);
		return activities.map((activity) => ({
			dbId: activity.dbId,
			totalDurationMs: safeStringToNumber(activity.totalDurationMs),
			endedAt: activity.endedAt,
			usageReportDbId: activity.usageReportDbId,
		}));
	}

	async findLastUsageReport(
		teamDbId: number,
		periodStart: Date,
		periodEnd: Date,
	): Promise<AgentTimeUsageReport | null> {
		const reports = await this.db
			.select()
			.from(agentTimeUsageReports)
			.where(
				and(
					eq(agentTimeUsageReports.teamDbId, teamDbId),
					gt(agentTimeUsageReports.timestamp, periodStart),
					lte(agentTimeUsageReports.timestamp, periodEnd),
				),
			)
			.orderBy(desc(agentTimeUsageReports.timestamp))
			.limit(1);
		if (reports.length === 0) {
			return null;
		}
		return {
			dbId: reports[0].dbId,
			teamDbId: reports[0].teamDbId,
			accumulatedDurationMs: safeStringToNumber(
				reports[0].accumulatedDurationMs,
			),
			minutesIncrement: reports[0].minutesIncrement,
			stripeMeterEventId: reports[0].stripeMeterEventId,
			timestamp: reports[0].timestamp,
		};
	}

	async createUsageReport(params: {
		teamDbId: number;
		accumulatedDurationMs: number;
		minutesIncrement: number;
		stripeMeterEventId: string;
		timestamp: Date;
	}): Promise<AgentTimeUsageReport> {
		const [report] = await this.db
			.insert(agentTimeUsageReports)
			.values({
				teamDbId: params.teamDbId,
				accumulatedDurationMs: params.accumulatedDurationMs.toString(),
				minutesIncrement: params.minutesIncrement,
				stripeMeterEventId: params.stripeMeterEventId,
				timestamp: params.timestamp,
			})
			.returning();
		if (report == null) {
			throw new Error("Failed to create usage report");
		}
		return {
			dbId: report.dbId,
			teamDbId: report.teamDbId,
			accumulatedDurationMs: safeStringToNumber(report.accumulatedDurationMs),
			minutesIncrement: report.minutesIncrement,
			stripeMeterEventId: report.stripeMeterEventId,
			timestamp: report.timestamp,
		};
	}

	async markActivitiesAsProcessed(
		activityIds: number[],
		usageReportId: number,
	): Promise<void> {
		if (activityIds.length === 0) {
			return;
		}
		await this.db
			.update(agentActivities)
			.set({
				usageReportDbId: usageReportId,
			})
			.where(inArray(agentActivities.dbId, activityIds));
	}
}

function safeStringToNumber(value: string): number {
	const num = Number(value);
	if (num > Number.MAX_SAFE_INTEGER) {
		throw new Error(`Value exceeds MAX_SAFE_INTEGER: ${value}`);
	}
	return num;
}
