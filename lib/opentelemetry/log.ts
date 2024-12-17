import { logger as pinoLogger } from "@/lib/logger";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { captureException } from "@sentry/nextjs";
import type { LogSchema, OtelLoggerWrapper } from "./types";

import type { AnyValue, Logger } from "@opentelemetry/api-logs";
import { Resource } from "@opentelemetry/resources";
import {
	type LogRecord as BaseLogRecord,
	BatchLogRecordProcessor,
	ConsoleLogRecordExporter,
	LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { headers } from "./base";

interface LogRecord extends BaseLogRecord {
	severityText: SeverityText;
}
type SeverityText = "INFO" | "ERROR" | "DEBUG";
type LogMethod = "info" | "error" | "debug";

class PinoLogRecordExporter extends ConsoleLogRecordExporter {
	onEmit(log: LogRecord) {
		const { severityText, body, attributes } = log;

		const message = body?.toString() || "";
		const attrs = attributes ? this.convertAttributes(attributes) : undefined;

		const logMethod = this.severityToMethod(severityText);
		const logger = pinoLogger[logMethod];

		if (attrs) {
			logger(attrs, message);
		} else {
			logger(message);
		}
	}
	private convertAttributes(
		attributes: Record<string, AnyValue>,
	): Record<string, unknown> {
		const result: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(attributes)) {
			if (value === null || value === undefined) {
				continue;
			}

			if (typeof value === "object") {
				result[key] = JSON.stringify(value);
			} else {
				result[key] = value;
			}
		}

		return result;
	}

	private severityToMethod = (
		severity: SeverityText | undefined,
	): LogMethod => {
		if (!severity) return "info";
		return severity.toLowerCase() as LogMethod;
	};
}

const logExporter = new OTLPLogExporter({
	url: "https://ingest.us.signoz.cloud:443/v1/logs",
	headers,
});

export const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
export const pinoLogRecordProcessor = new BatchLogRecordProcessor(
	new PinoLogRecordExporter(),
);

let sharedLoggerProvider: LoggerProvider | null = null;
function getOrCreateLoggerProvider() {
	if (!sharedLoggerProvider) {
		const defaultResource = Resource.default();
		const customResource = new Resource({
			[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
				process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
		});
		sharedLoggerProvider = new LoggerProvider({
			resource: defaultResource.merge(customResource),
		});

		sharedLoggerProvider.addLogRecordProcessor(logRecordProcessor);
		sharedLoggerProvider.addLogRecordProcessor(pinoLogRecordProcessor);
	}
	return sharedLoggerProvider;
}

function createEmitLog(otelLogger: Logger) {
	return function emitLog(
		severity: SeverityText,
		obj: object | string | Error,
		msg?: string,
	) {
		if (obj instanceof Error) {
			const errorAttributes: Record<string, string> = {
				name: obj.name,
				message: obj.message,
				stack: obj.stack || "",
			};

			for (const [key, value] of Object.entries(obj)) {
				if (
					typeof value === "string" ||
					typeof value === "number" ||
					typeof value === "boolean"
				) {
					errorAttributes[key] = String(value);
				}
			}

			otelLogger.emit({
				severityText: severity,
				body: obj.message,
				attributes: errorAttributes,
			});
		} else if (typeof obj === "string") {
			otelLogger.emit({
				severityText: severity,
				body: obj,
			});
		} else {
			otelLogger.emit({
				severityText: severity,
				body: msg || "",
				attributes: obj as Record<string, string | number | boolean>,
			});
		}
	};
}

function getSchemaUrl() {
	switch (process.env.NEXT_PUBLIC_VERCEL_ENV) {
		case "production":
			return "https://raw.githubusercontent.com/giselles-ai/giselle/main/lib/opentelemetry/types.ts";
		case "preview":
			return `https://raw.githubusercontent.com/giselles-ai/giselle/refs/heads/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/lib/opentelemetry/types.ts`;
		default: // development
			return "@/lib/opentelemetry/types.ts";
	}
}

const getVersion = () => {
	return undefined; // to be implemented
};

export function createLogger(usecase: string): OtelLoggerWrapper {
	const loggerProvider = getOrCreateLoggerProvider();
	const otelLogger = loggerProvider.getLogger(usecase, getVersion(), {
		schemaUrl: getSchemaUrl(),
	});
	const emitLog = createEmitLog(otelLogger);

	return {
		info: (obj: LogSchema, msg?: string) => {
			emitLog("INFO", obj, msg);
		},
		error: (obj: LogSchema | Error, msg?: string) => {
			emitLog("ERROR", obj, msg);
		},
		debug: (obj: LogSchema, msg?: string) => {
			emitLog("DEBUG", obj, msg);
		},
	};
}

export const captureError = (
	logger: OtelLoggerWrapper,
	error: unknown,
	message: string,
) => {
	if (error instanceof Error) {
		logger.error(error, message);
	} else {
		logger.error(new Error("Unknown error occurred"), message);
	}
	captureException(error);
};
