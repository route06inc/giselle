import { getCurrentMeasurementScope, isRoute06User } from "@/app/(auth)/lib";
import { waitUntil } from "@vercel/functions";
import type { LanguageModelUsage } from "ai";
import type { LanguageModelV1 } from "ai";
import type { Strategy } from "unstructured-client/sdk/models/shared";
import { captureError } from "./log";
import type { LogSchema, OtelLoggerWrapper } from "./types";
import {
	ExternalServiceName,
	type RequestCountSchema,
	type TokenBasedServiceName,
	type TokenConsumedSchema,
	UnimplementedServiceName,
} from "./types";

type ModelInfo = {
	externalServiceName: TokenBasedServiceName;
	modelId: string;
};

interface ModelConfig extends LanguageModelV1 {
	modelId: string;
	config: {
		provider: string;
	};
}

function getModelInfo(
	logger: OtelLoggerWrapper,
	modelConfiguration: ModelConfig,
): ModelInfo {
	const [provider, _subtype] = modelConfiguration.config.provider.split(".");
	const modelId = modelConfiguration.modelId;

	switch (provider) {
		case "openai":
			return {
				externalServiceName: ExternalServiceName.OpenAI,
				modelId,
			};
		case "anthropic":
			return {
				externalServiceName: ExternalServiceName.Anthropic,
				modelId,
			};
		case "google":
			return {
				externalServiceName: ExternalServiceName.Google,
				modelId,
			};
		default:
			logger.error(
				new Error(`unknown provider '${provider}' passed`),
				"consider adding to 'ExternalServiceName'",
			);
			return {
				externalServiceName: UnimplementedServiceName.Unknown,
				modelId: "unknown",
			};
	}
}

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
	const startTime = measurementStartTime ?? performance.now(); // set `startTime` for each call in parallel process
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
	VercelBlob: ExternalServiceName.VercelBlob,
	Tavily: ExternalServiceName.Tavily,
	Firecrawl: ExternalServiceName.Firecrawl,
} as const;

type VercelBlobOperationType = "put" | "fetch";

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
	externalServiceName: typeof APICallBasedService.VercelBlob,
	measurementStartTime: number | undefined,
	operationType: VercelBlobOperationType,
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
	strategyOrOptions?: Strategy | VercelBlobOperationType | undefined,
): Promise<T> {
	const measurement: MeasurementSchema<T> = (
		result,
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
			if (!strategyOrOptions) {
				logger.error(
					new Error("'strategy' is required for Unstructured service"),
					"missing required strategy parameter",
				);
			}
			return {
				...baseMetrics,
				externalServiceName,
				strategy: strategyOrOptions as Strategy,
			};
		}

		if (externalServiceName === APICallBasedService.VercelBlob) {
			const operationType = strategyOrOptions as VercelBlobOperationType;
			switch (operationType) {
				case "put":
					return {
						...baseMetrics,
						externalServiceName,
						operationType: "put",
						blobSizeStored: (result as { size: number }).size,
					};
				case "fetch":
					return {
						...baseMetrics,
						externalServiceName,
						operationType: "fetch",
						blobSizeTransfered: (result as { size: number }).size,
					};
			}
		}

		return {
			...baseMetrics,
			externalServiceName,
		};
	};

	return withMeasurement(logger, operation, measurement, measurementStartTime);
}

export function withTokenMeasurement<T extends { usage: LanguageModelUsage }>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	model: LanguageModelV1,
	measurementStartTime?: number,
): Promise<T> {
	const { externalServiceName, modelId } = getModelInfo(
		logger,
		model as ModelConfig,
	);
	const measurements: MeasurementSchema<T> = (
		result,
		duration,
		measurementScope,
		isR06User,
	): TokenConsumedSchema => ({
		externalServiceName,
		modelId,
		tokenConsumedInput: result.usage.promptTokens,
		tokenConsumedOutput: result.usage.completionTokens,
		duration,
		measurementScope,
		isR06User,
	});

	return withMeasurement(logger, operation, measurements, measurementStartTime);
}

export function waitForTelemetryExport() {
	waitUntil(
		new Promise((resolve) =>
			setTimeout(
				resolve,
				Number.parseInt(process.env.OTEL_EXPORT_INTERVAL_MILLIS ?? "1000") +
					Number.parseInt(process.env.WAITUNTIL_OFFSET_MILLIS ?? "0"),
			),
		),
	);
}
