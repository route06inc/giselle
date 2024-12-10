import { z } from "zod";

const ExternalServiceName = {
	Firecrawl: "firecrawl",
	OpenAI: "openai",
	Tavily: "tavily",
} as const;

export type ExternalServiceName =
	(typeof ExternalServiceName)[keyof typeof ExternalServiceName];

const BaseMetricsSchema = z.object({
	externalServiceName: z.nativeEnum(ExternalServiceName), // Name of the service to which agent requests
	duration: z.number().min(0), // Time taken for text generation in milliseconds
	measurementScope: z.number(), // ID of the plan usage contract to which the requester belongs
	isR06User: z.boolean(), // Whether the requester has internal user
});

const TokenConsumedSchema = BaseMetricsSchema.extend({
	tokenConsumedInput: z.number(), // Number of tokens used in the prompt/input sent to the model
	tokenConsumedOutput: z.number(), // Number of tokens used in the response/output received from the model
});

const RequestCountSchema = BaseMetricsSchema.extend({
	requestCount: z.number(), // Number of requests called
});

export type TokenConsumedSchema = z.infer<typeof TokenConsumedSchema>;
export type RequestCountSchema = z.infer<typeof RequestCountSchema>;
export type LogSchema = TokenConsumedSchema | RequestCountSchema;

export interface OtelLoggerWrapper {
	info: (obj: LogSchema, msg?: string) => void;
	error: (obj: LogSchema | Error, msg?: string) => void;
	debug: (obj: LogSchema, msg?: string) => void;
}
