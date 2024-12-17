export type AgentActivity = {
	dbId: number;
	totalDurationMs: number;
	endedAt: Date;
	usageReportDbId: number | null;
};

export type AgentTimeUsageReport = {
	dbId: number;
	teamDbId: number;
	accumulatedDurationMs: number;
	minutesIncrement: number;
	stripeMeterEventId: string;
	timestamp: Date;
};

export type Subscription = {
	subscriptionId: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
};

export interface AgentTimeUsageDataAccess {
	transaction<T>(fn: (dao: AgentTimeUsageDataAccess) => Promise<T>): Promise<T>;

	fetchCurrentSubscription(teamDbId: number): Promise<Subscription>;

	findUnprocessedActivities(
		teamDbId: number,
		periodStart: Date,
		periodEnd: Date,
	): Promise<AgentActivity[]>;

	findLastUsageReport(
		teamDbId: number,
		periodStart: Date,
		periodEnd: Date,
	): Promise<AgentTimeUsageReport | null>;

	createUsageReport(params: {
		teamDbId: number;
		accumulatedDurationMs: number;
		minutesIncrement: number;
		stripeMeterEventId: string;
		timestamp: Date;
	}): Promise<AgentTimeUsageReport>;

	markActivitiesAsProcessed(
		activityIds: number[],
		usageReportId: number,
	): Promise<void>;
}
