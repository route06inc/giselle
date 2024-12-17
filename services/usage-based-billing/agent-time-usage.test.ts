import { describe, expect, mock, test } from "bun:test";
import {
	calculateAgentTimeUsage,
	processUnreportedActivities,
} from "./agent-time-usage";

describe("calculateAgentTimeUsage", () => {
	test("when there are only new activities", () => {
		const result = calculateAgentTimeUsage(
			[{ totalDurationMs: 60 * 1000 }, { totalDurationMs: 30 * 1000 }],
			null,
		);

		expect(result.accumulatedDurationMs).toBe(90000);
		expect(result.minutesIncrement).toBe(1);
	});

	test("when there is existing accumulated time", () => {
		const result = calculateAgentTimeUsage([{ totalDurationMs: 60 * 1000 }], {
			accumulatedDurationMs: 90 * 1000,
		});

		expect(result.accumulatedDurationMs).toBe(150000);
		expect(result.minutesIncrement).toBe(1); // 1 minute previously, 2 minutes now, difference is 1 minute
	});

	test("with empty activity list", () => {
		const result = calculateAgentTimeUsage([], null);

		expect(result.accumulatedDurationMs).toBe(0);
		expect(result.minutesIncrement).toBe(0);
	});

	test("handling over int32 max numbers", () => {
		const result = calculateAgentTimeUsage(
			[
				{ totalDurationMs: 2147483647 }, // About 35.8 minutes (int32 max)
				{ totalDurationMs: 2147483647 },
			],
			null,
		);

		expect(result.accumulatedDurationMs).toBe(2147483647 + 2147483647);
		expect(result.minutesIncrement).toBe(71582);
	});

	test("when current usage is less than previous report (increment should be 0)", () => {
		const result = calculateAgentTimeUsage([{ totalDurationMs: 30 * 1000 }], {
			accumulatedDurationMs: 60 * 1000,
		});

		expect(result.accumulatedDurationMs).toBe(90000);
		expect(result.minutesIncrement).toBe(0); // Same minute as previous report, so no increment
	});

	test("edge case: 59.9 seconds should count as 0 minutes", () => {
		const result = calculateAgentTimeUsage(
			[{ totalDurationMs: 59.9 * 1000 }],
			null,
		);

		expect(result.accumulatedDurationMs).toBe(59900);
		expect(result.minutesIncrement).toBe(0);
	});

	test("edge case: exactly 60 seconds should count as 1 minute", () => {
		const result = calculateAgentTimeUsage(
			[{ totalDurationMs: 60 * 1000 }],
			null,
		);

		expect(result.accumulatedDurationMs).toBe(60000);
		expect(result.minutesIncrement).toBe(1);
	});

	test("edge case: 59.9 + incoming 0.1 seconds should count as 1 minutes", () => {
		const result = calculateAgentTimeUsage([{ totalDurationMs: 0.1 * 1000 }], {
			accumulatedDurationMs: 59.9 * 1000,
		});

		expect(result.accumulatedDurationMs).toBe(60000);
		expect(result.minutesIncrement).toBe(1);
	});

	test("lastReported = 30 min, incoming 60 seconds should count as 1 minutes", () => {
		const result = calculateAgentTimeUsage([{ totalDurationMs: 60 * 1000 }], {
			accumulatedDurationMs: 30 * 60 * 1000, // 30 min
		});

		expect(result.accumulatedDurationMs).toBe(30 * 60 * 1000 + 60 * 1000);
		expect(result.minutesIncrement).toBe(1);
	});
});

describe("processUnreportedActivities", () => {
	const mockStripe = {
		subscriptions: {
			retrieve: mock(async () => ({
				customer: "cust_123",
			})),
		},
		v2: {
			billing: {
				meterEvents: {
					create: mock(async () => ({
						identifier: "meter_123",
					})),
				},
			},
		},
	};

	test("successful processing flow", async () => {
		const mockDao = {
			// biome-ignore lint/suspicious/noExplicitAny: mock
			transaction: async (fn: any) => fn(mockDao),
			fetchCurrentSubscription: mock(async () => ({
				subscriptionId: "sub_123",
				currentPeriodStart: new Date("2024-01-01"),
				currentPeriodEnd: new Date("2024-01-31"),
			})),
			findUnprocessedActivities: mock(async () => [
				{
					dbId: 1,
					totalDurationMs: 60000,
					endedAt: new Date("2024-01-15"),
					usageReportDbId: null,
				},
			]),
			findLastUsageReport: mock(async () => null),
			createUsageReport: mock(async () => ({
				dbId: 1,
				teamDbId: 123,
				accumulatedDurationMs: 60000,
				minutesIncrement: 1,
				stripeMeterEventId: "meter_123",
				timestamp: new Date(),
			})),
			markActivitiesAsProcessed: mock(async () => {}),
		};

		const result = await processUnreportedActivities(
			{
				teamDbId: 123,
				targetDate: new Date("2024-01-31"),
			},
			{
				dao: mockDao,
				// biome-ignore lint/suspicious/noExplicitAny: mock
				stripe: mockStripe as any,
			},
		);

		expect(result.processedReportId).toBe(1);
		expect(mockStripe.v2.billing.meterEvents.create).toHaveBeenCalled();
		expect(mockDao.createUsageReport).toHaveBeenCalled();
		expect(mockDao.markActivitiesAsProcessed).toHaveBeenCalled();
	});

	test("when there are no unprocessed activities", async () => {
		const mockDao = {
			// biome-ignore lint/suspicious/noExplicitAny: mock
			transaction: async (fn: any) => fn(mockDao),
			fetchCurrentSubscription: mock(async () => ({
				subscriptionId: "sub_123",
				currentPeriodStart: new Date("2024-01-01"),
				currentPeriodEnd: new Date("2024-01-31"),
			})),
			findUnprocessedActivities: mock(async () => []),
			findLastUsageReport: mock(async () => null),
			createUsageReport: mock(async () => ({
				dbId: 1,
				teamDbId: 123,
				accumulatedDurationMs: 60000,
				minutesIncrement: 1,
				stripeMeterEventId: "meter_123",
				timestamp: new Date(),
			})),
			markActivitiesAsProcessed: mock(async () => {}),
		};

		const result = await processUnreportedActivities(
			{
				teamDbId: 123,
				targetDate: new Date("2024-01-31"),
			},
			{
				dao: mockDao,
				// biome-ignore lint/suspicious/noExplicitAny: mock
				stripe: mockStripe as any,
			},
		);

		expect(result.processedReportId).toBeNull();
	});

	test("handles billing cycle transition", async () => {
		const mockDao = {
			// biome-ignore lint/suspicious/noExplicitAny: mock
			transaction: async (fn: any) => fn(mockDao),
			fetchCurrentSubscription: mock(async () => ({
				subscriptionId: "sub_123",
				currentPeriodStart: new Date("2024-02-01T00:00:00Z"),
				currentPeriodEnd: new Date("2024-02-29T23:59:59Z"),
			})),
			// Mock the state where new billing cycle has already started
			findUnprocessedActivities: mock(async () => [
				{
					dbId: 1,
					totalDurationMs: 60000,
					endedAt: new Date("2024-01-15"),
					usageReportDbId: null,
				},
			]),
			findLastUsageReport: mock(async () => null),
			createUsageReport: mock(async () => ({
				dbId: 1,
				teamDbId: 123,
				accumulatedDurationMs: 60000,
				minutesIncrement: 1,
				stripeMeterEventId: "meter_123",
				timestamp: new Date(),
			})),
			markActivitiesAsProcessed: mock(async () => {}),
		};

		// Process activities from the last day of previous billing cycle
		const result = await processUnreportedActivities(
			{
				teamDbId: 123,
				targetDate: new Date("2024-01-31T23:59:59Z"), // Last day of previous period
			},
			{
				dao: mockDao,
				// biome-ignore lint/suspicious/noExplicitAny: mock
				stripe: mockStripe as any,
			},
		);

		expect(result.processedReportId).toBe(1);
		expect(mockStripe.v2.billing.meterEvents.create).toHaveBeenCalledWith(
			expect.objectContaining({
				event_name: "agent_time_charge",
				payload: expect.objectContaining({
					value: "1",
				}),
			}),
		);
		expect(mockDao.findUnprocessedActivities).toHaveBeenCalledWith(
			123,
			new Date("2024-01-01T00:00:00Z"), // Start of previous period
			new Date("2024-02-01T00:00:00Z"), // End of previous period
		);
	});

	test("processes current period when target date is in current period", async () => {
		const mockDao = {
			// biome-ignore lint/suspicious/noExplicitAny: mock
			transaction: async (fn: any) => fn(mockDao),
			fetchCurrentSubscription: mock(async () => ({
				subscriptionId: "sub_123",
				currentPeriodStart: new Date("2024-02-01T00:00:00Z"),
				currentPeriodEnd: new Date("2024-02-29T23:59:59Z"),
			})),
			findUnprocessedActivities: mock(async () => [
				{
					dbId: 1,
					totalDurationMs: 60000,
					endedAt: new Date("2024-01-15"),
					usageReportDbId: null,
				},
			]),
			findLastUsageReport: mock(async () => null),
			createUsageReport: mock(async () => ({
				dbId: 1,
				teamDbId: 123,
				accumulatedDurationMs: 60000,
				minutesIncrement: 1,
				stripeMeterEventId: "meter_123",
				timestamp: new Date(),
			})),
			markActivitiesAsProcessed: mock(async () => {}),
		};

		const result = await processUnreportedActivities(
			{
				teamDbId: 123,
				targetDate: new Date("2024-02-15T12:00:00Z"), // Date in current period
			},
			{
				dao: mockDao,
				// biome-ignore lint/suspicious/noExplicitAny: mock
				stripe: mockStripe as any,
			},
		);

		expect(result.processedReportId).toBe(1);
		expect(mockDao.findUnprocessedActivities).toHaveBeenCalledWith(
			123,
			new Date("2024-02-01T00:00:00Z"), // Start of current period
			new Date("2024-02-29T23:59:59Z"), // End of current period
		);
	});
});
