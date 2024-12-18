import { giselleNodeArchetypes } from "../giselle-node/blueprints";
import type { GiselleNode } from "../giselle-node/types";
import type { ModelConfiguration, ModelProvider } from "./types";

export function isModelProvider(value: unknown): value is ModelProvider {
	return value === "openai" || value === "anthropic";
}

const fallbackModelConfiguration: ModelConfiguration = {
	provider: "openai",
	modelId: "gpt-4o",
	temperature: 0.7,
	topP: 0.8,
};
export function resolveModelConfiguration(
	node: GiselleNode,
): ModelConfiguration {
	if (node.archetype !== giselleNodeArchetypes.textGenerator) {
		return fallbackModelConfiguration;
	}
	if (
		node.properties === null ||
		typeof node.properties !== "object" ||
		!("llm" in node.properties) ||
		typeof node.properties.llm !== "string"
	) {
		return fallbackModelConfiguration;
	}
	const [provider, modelId] = node.properties.llm.split(":");
	if (!isModelProvider(provider) || typeof modelId !== "string") {
		return fallbackModelConfiguration;
	}
	return {
		provider,
		modelId,
		temperature: 0.7,
		topP: 0.8,
	};
}
