import type {
	GiselleNodeArtifactElement,
	GiselleNodeId,
} from "../giselle-node/types";

type ArtifactElement = GiselleNodeArtifactElement | Artifact;
export type ArtifactId = `art_${string}`;
export type Artifact = {
	id: ArtifactId;
	object: "artifact";
	title: string;
	content: string;
	generatorNode: GiselleNodeArtifactElement;
};
export type ArtifactReference = {
	id: ArtifactId;
	object: "artifact.reference";
};

interface Citation {
	title: string;
	url: string;
}
export type GeneratedObject = {
	thinking: string;
	artifact: {
		title: string;
		content: string;
		citations: Citation[];
		completed: boolean;
	};
	description: string;
};
export type PartialGeneratedObject = Partial<GeneratedObject>;

export type ModelProvider = "openai" | "anthropic";
export interface ModelConfiguration {
	provider: ModelProvider;
	modelId: string;
	temperature: number;
	topP: number;
}
