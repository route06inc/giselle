import { getCurrentMeasurementScope, isRoute06User } from "@/app/(auth)/lib";
import { waitUntil } from "@vercel/functions";
import type { LanguageModelUsage } from "ai";
import type { LanguageModelV1 } from "ai";
import { PDFDocument } from "pdf-lib";
import type { UnstructuredClient } from "unstructured-client";
import type { PartitionResponse } from "unstructured-client/sdk/models/operations/partition";
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
	const startTime = measurementStartTime ?? Date.now(); // set `startTime` for each call in parallel process
	try {
		// business logic: error should be thrown
		const result = await operation();

		try {
			// instrumentation: error must not be thrown to avoid interfering with the business logic
			const duration = Date.now() - startTime;
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

export const VercelBlobOperation = {
	Put: {
		type: "put" as const,
		measure: (result: { size: number }) => ({
			blobSizeStored: result.size,
		}),
	},
	Fetch: {
		type: "fetch" as const,
		measure: (result: { size: number }) => ({
			blobSizeTransfered: result.size,
		}),
	},
	Del: {
		type: "del" as const,
		measure: (result: { size: number }) => ({
			blobSizeStored: -result.size,
		}),
	},
	List: {
		type: "list" as const,
		measure: (result: { size: number }) => ({
			blobSizeTransfered: result.size,
		}),
	},
} as const;

type VercelBlobOperationType =
	(typeof VercelBlobOperation)[keyof typeof VercelBlobOperation];

interface UnstructuredOptions {
	strategy: Strategy;
	pdf: PDFDocument;
}

type ServiceOptions = UnstructuredOptions | VercelBlobOperationType | undefined;

function getNumPages(pdf: PDFDocument) {
	return pdf.getPages().length;
}

export function withCountMeasurement<T>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	externalServiceName: typeof APICallBasedService.Unstructured,
	measurementStartTime: number | undefined,
	serviceOptions: UnstructuredOptions,
): Promise<T>;
export function withCountMeasurement<T>(
	logger: OtelLoggerWrapper,
	operation: () => Promise<T>,
	externalServiceName: typeof APICallBasedService.VercelBlob,
	measurementStartTime: number | undefined,
	serviceOptions: VercelBlobOperationType,
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
	serviceOptions?: ServiceOptions,
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
			const unstructuredOptions = serviceOptions as UnstructuredOptions;
			if (
				!unstructuredOptions ||
				!unstructuredOptions.strategy ||
				!unstructuredOptions.pdf
			) {
				logger.error(
					new Error(
						"'strategy' and 'numPages' are required for Unstructured service",
					),
					"missing required strategy parameter",
				);
			}
			return {
				...baseMetrics,
				externalServiceName,
				strategy: unstructuredOptions.strategy,
				numPages: getNumPages(unstructuredOptions.pdf),
			};
		}

		if (externalServiceName === APICallBasedService.VercelBlob) {
			const operation = serviceOptions as VercelBlobOperationType;
			if (!operation) {
				logger.error(
					new Error(
						"'VercelBlobOperationType' is required for VercelBlob service",
					),
					"missing required VercelBlobOperationType parameter",
				);
			}
			const operationResult = operation.measure(result as { size: number });
			return {
				...baseMetrics,
				externalServiceName,
				operationType: operation.type,
				...operationResult,
			} as RequestCountSchema;
		}

		return {
			...baseMetrics,
			externalServiceName,
		};
	};

	return withMeasurement(logger, operation, measurement, measurementStartTime);
}

export type PartitionParameters = {
	fileName: string;
	strategy: Strategy;
	splitPdfPage: boolean;
	splitPdfConcurrencyLevel: number;
};

export type MeasureParameters = {
	logger: OtelLoggerWrapper;
	startTime: number;
};

export async function wrappedPartition(
	client: UnstructuredClient,
	blobUrl: string,
	{
		fileName,
		strategy,
		splitPdfPage,
		splitPdfConcurrencyLevel,
	}: PartitionParameters,
	{ logger, startTime }: MeasureParameters,
): Promise<PartitionResponse> {
	const content = await fetch(blobUrl).then((response) => response.blob());

	return withCountMeasurement(
		logger,
		async () =>
			client.general.partition({
				partitionParameters: {
					files: { fileName, content },
					strategy,
					splitPdfPage,
					splitPdfConcurrencyLevel,
				},
			}),
		ExternalServiceName.Unstructured,
		startTime,
		{ strategy, pdf: await PDFDocument.load(await content.arrayBuffer()) },
	).finally(() => waitForTelemetryExport());
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
