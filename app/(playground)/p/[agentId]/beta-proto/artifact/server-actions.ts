"use server";

import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";

import { getCurrentMeasurementScope, isRoute06User } from "@/app/(auth)/lib";
import { langfuseModel } from "@/lib/llm";
import { createLogger } from "@/lib/opentelemetry";
import { waitUntil } from "@vercel/functions";
import { Langfuse } from "langfuse";
import { schema as artifactSchema } from "../artifact/schema";
import { buildLanguageModel } from "../flow/server-actions/generate-text";
import type { SourceIndex } from "../source/types";
import { sourceIndexesToSources, sourcesToText } from "../source/utils";
import type { AgentId } from "../types";
import type { ModelConfiguration } from "./types";

type GenerateArtifactStreamParams = {
	agentId: AgentId;
	userPrompt: string;
	sourceIndexes: SourceIndex[];
	modelConfiguration: ModelConfiguration;
};
export async function generateArtifactStream(
	params: GenerateArtifactStreamParams,
) {
	const startTime = performance.now();
	const lf = new Langfuse();
	const trace = lf.trace({
		id: `giselle-${Date.now()}`,
	});
	const logger = createLogger("generate-artifact");
	const sources = await sourceIndexesToSources({
		input: {
			agentId: params.agentId,
			sourceIndexes: params.sourceIndexes,
		},
	});

	const system =
		sources.length > 0
			? `
Your primary objective is to fulfill the user's request by utilizing the information provided within the <Source> or <WebPage> tags. Analyze the structured content carefully and leverage it to generate accurate and relevant responses. Focus on addressing the user's needs effectively while maintaining coherence and context throughout the interaction.

If you use the information provided in the <WebPage>, After each piece of information, add a superscript number for citation (e.g. 1, 2, etc.).

${sourcesToText(sources)}

`
			: "You generate an answer to a question. ";

	const stream = createStreamableValue();

	(async () => {
		const model = buildLanguageModel(params.modelConfiguration);
		const generation = trace.generation({
			name: "generate-text",
			input: params.userPrompt,
			model: langfuseModel(params.modelConfiguration.modelId),
			modelParameters: {
				topP: params.modelConfiguration.topP,
				temperature: params.modelConfiguration.temperature,
			},
		});
		try {
			const { partialObjectStream, object } = await streamObject({
				model,
				system,
				temperature: params.modelConfiguration.temperature,
				topP: params.modelConfiguration.topP,
				prompt: params.userPrompt,
				schema: artifactSchema,
				onFinish: async (result) => {
					const duration = performance.now() - startTime;
					const measurementScope = await getCurrentMeasurementScope();
					const isR06User = await isRoute06User();
					generation.end({
						output: result,
					});

					logger.info(
						{
							externalServiceName: "openai",
							tokenConsumed: {
								input: result.usage.promptTokens,
								output: result.usage.completionTokens,
							},
							duration,
							measurementScope,
							isR06User,
						},
						"response obtained",
					);

					await lf.shutdownAsync();
					waitUntil(
						new Promise((resolve) =>
							setTimeout(
								resolve,
								Number.parseInt(
									process.env.OTEL_EXPORT_INTERVAL_MILLIS ?? "1000",
								),
							),
						),
					); // wait until telemetry sent
				},
			});

			for await (const partialObject of partialObjectStream) {
				stream.update(partialObject);
			}

			const result = await object;
		} catch (error) {
			stream.append(`${error}`);
		}
		stream.done();
	})();

	return { object: stream.value, traceId: trace.id };
}
