"use server";

import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";

import { langfuseModel } from "@/lib/llm";
import { createLogger, withTokenMeasurement } from "@/lib/opentelemetry";
import { fetchCurrentUser } from "@/services/accounts/fetch-current-user";
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
	const currentUser = await fetchCurrentUser();
	const trace = lf.trace({
		id: `giselle-${Date.now()}`,
		userId: currentUser.dbId.toString(),
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
					await withTokenMeasurement(
						logger,
						async () => {
							generation.end({ output: result });
							await lf.shutdownAsync();
							waitUntil(
								new Promise((resolve) =>
									setTimeout(
										resolve,
										Number.parseInt(
											process.env.OTEL_EXPORT_INTERVAL_MILLIS ?? "1000",
										) +
											Number.parseInt(
												process.env.WAITUNTIL_OFFSET_MILLIS ?? "0",
											),
									),
								),
							); // wait until telemetry sent
							return result;
						},
						startTime,
					);
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
