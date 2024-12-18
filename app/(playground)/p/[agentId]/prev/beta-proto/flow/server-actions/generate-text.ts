import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { type LanguageModelV1, streamObject } from "ai";
import { createArtifactId } from "../../artifact/factory";
import { schema as artifactSchema } from "../../artifact/schema";
import type { ArtifactId } from "../../artifact/types";
import type { Source } from "../source/types";
import { sourcesToText } from "../source/utils";

export function buildLanguageModel(
	modelConfiguration: ModelConfiguration,
): LanguageModelV1 {
	if (modelConfiguration.provider === "openai") {
		return openai("gpt-4o-mini");
	}
	if (modelConfiguration.provider === "anthropic") {
		return anthropic("claude-3-5-sonnet-20241022");
	}
	throw new Error("Unsupported model provider");
}

export interface TextArtifact {
	id: ArtifactId;
	object: "artifact.text";
	title: string;
	content: string;
}
export type BuildTextArtifactInput = Omit<TextArtifact, "id" | "object">;
export function buildTextArtifact(input: BuildTextArtifactInput): TextArtifact {
	return {
		...input,
		object: "artifact.text",
		id: createArtifactId(),
	};
}

type ModelProvider = "openai" | "anthropic";
export function isModelProvider(value: unknown): value is ModelProvider {
	return value === "openai" || value === "anthropic";
}
export interface ModelConfiguration {
	provider: ModelProvider;
	modelId: string;
	temperature: number;
	topP: number;
}
interface GenerateArtifactObjectInput {
	model: ModelConfiguration;
	prompt: string;
	sources: Source[];
}
interface GenerateArtifactObjectOptions {
	onStreamPartialObject?: (partialObject: Partial<TextArtifact>) => void;
}
export async function generateArtifactObject({
	input,
	options,
}: {
	input: GenerateArtifactObjectInput;
	options?: GenerateArtifactObjectOptions;
}) {
	const model = buildLanguageModel(input.model);
	const system =
		input.sources.length > 0
			? `
 Your primary objective is to fulfill the user's request by utilizing the information provided within the <Source> or <WebPage> tags. Analyze the structured content carefully and leverage it to generate accurate and relevant responses. Focus on addressing the user's needs effectively while maintaining coherence and context throughout the interaction.

 If you use the information provided in the <WebPage>, After each piece of information, add a superscript number for citation (e.g. 1, 2, etc.).

 ${sourcesToText(input.sources)}

 `
			: "You generate an answer to a question. ";

	const { partialObjectStream, object } = await streamObject({
		model,
		topP: input.model.topP,
		temperature: input.model.temperature,
		system,
		prompt: input.prompt,
		schema: artifactSchema,
	});

	for await (const partialObject of partialObjectStream) {
		options?.onStreamPartialObject?.({
			object: "artifact.text",
			title: partialObject.artifact?.title || "",
			content: partialObject.artifact?.content || "",
		});
	}
	return await object;
}
