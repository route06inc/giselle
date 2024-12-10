import { getCurrentMeasurementScope, isRoute06User } from "@/app/(auth)/lib";
import type { Strategy } from "unstructured-client/sdk/models/shared";
import { captureError } from "./log";
import type { LogSchema, OtelLoggerWrapper } from "./types";
import {
	ExternalServiceName,
	type RequestCountSchema,
	type TokenConsumedSchema,
} from "./types";

type MeasurementSchema<T> = (
	result: T,
	duration: number,
	measurementScope: number,
	isR06User: boolean,
) => LogSchema;

async function withMeasurement<T>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	measurement: MeasurementSchema<T>,
	measurementStartTime?: number,
): Promise<T> {
	const startTime = measurementStartTime ?? performance.now();
	try {
		// business logic: error should be thrown
		const result = await operation();

		try {
			// instrumentation: error must not be thrown to avoid interfering with the business logic
			const duration = performance.now() - startTime;
			Promise.all([getCurrentMeasurementScope(), isRoute06User()])
				.then(([measurementScope, isR06User]) => {
					const metrics = measurement(
						result,
						duration,
						measurementScope,
						isR06User,
					);
					logger.info(
						metrics,
						`[${metrics.externalServiceName}] response obtained`,
					);
				})
				.catch((getMetricsTagError) => {
					captureError(
						logger,
						getMetricsTagError,
						"failed to get user info for logging",
					);
				});
		} catch (instrumentationError) {
			captureError(logger, instrumentationError, "instrumentation failed");
		}
		return result;
	} catch (error) {
		captureError(logger, error, "operation failed");
		throw error;
	}
}

const APICallBasedService = {
	Unstructured: ExternalServiceName.Unstructured,
	Tavily: ExternalServiceName.Tavily,
	Firecrawl: ExternalServiceName.Firecrawl,
} as const;

const TokenBasedService = {
	OpenAI: ExternalServiceName.OpenAI,
} as const;

export function withCountMeasurement<T>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	externalServiceName: typeof APICallBasedService.Unstructured,
	measurementStartTime: number | undefined,
	strategy: Strategy,
): Promise<T>;
export function withCountMeasurement<T>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	externalServiceName:
		| typeof APICallBasedService.Tavily
		| typeof APICallBasedService.Firecrawl,
	measurementStartTime?: number,
): Promise<T>;
export function withCountMeasurement<T>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	externalServiceName: (typeof APICallBasedService)[keyof typeof APICallBasedService],
	measurementStartTime?: number,
	strategy?: Strategy,
): Promise<T> {
	const measurement: MeasurementSchema<T> = (
		_result,
		duration,
		measurementScope,
		isR06User,
	): RequestCountSchema => {
		const baseMetrics = {
			duration,
			measurementScope,
			isR06User,
			requestCount: 1,
		};

		if (externalServiceName === APICallBasedService.Unstructured) {
			if (!strategy) {
				logger.error(
					new Error("'strategy' is required for Unstructured service"),
					"missing required strategy parameter",
				);
			}
			return {
				...baseMetrics,
				externalServiceName,
				strategy: strategy as Strategy,
			};
		}

		return {
			...baseMetrics,
			externalServiceName,
		};
	};

	return withMeasurement(logger, operation, measurement, measurementStartTime);
}
