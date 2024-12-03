import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createId } from "@paralleldrive/cuid2";
import type { LanguageModelV1 } from "ai";
import { vercelBlobGraphFolder } from "./constants";
import type {
	ArtifactId,
	ConnectionId,
	File,
	FileId,
	Graph,
	GraphId,
	Node,
	NodeHandleId,
	NodeId,
	Text,
	TextGenerateActionContent,
	TextGeneration,
} from "./types";

export function createNodeId(): NodeId {
	return `nd_${createId()}`;
}
export function createArtifactId(): ArtifactId {
	return `artf_${createId()}`;
}

export function createGraphId(): GraphId {
	return `grph_${createId()}`;
}

export function createNodeHandleId(): NodeHandleId {
	return `ndh_${createId()}`;
}

export function createConnectionId(): ConnectionId {
	return `cnnc_${createId()}`;
}

export function createFileId(): FileId {
	return `fl_${createId()}`;
}

export function resolveLanguageModel(
	llm: TextGenerateActionContent["llm"],
): LanguageModelV1 {
	const [provider, model] = llm.split(":");
	if (provider === "openai") {
		return openai(model);
	}
	if (provider === "anthropic") {
		return anthropic(model);
	}
	throw new Error("Unsupported model provider");
}

export function isTextGeneration(node: Node): node is TextGeneration {
	return node.content.type === "textGeneration";
}

export function isText(node: Node): node is Text {
	return node.content.type === "text";
}

export function isFile(node: Node): node is File {
	return node.content.type === "file";
}

interface Element {
	type: string;
	element_id: string;
	text: string;
	metadata: {
		languages: string[];
		page_number: number;
		filename: string;
		filetype: string;
		parent_id?: string;
	};
}

/**
 * Check if the given object is an Unstructured Element.
 * Now, it's not check metadata field because it's not used in the function.
 */
function isElement(obj: unknown): obj is Element {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as Element).type === "string" &&
		typeof (obj as Element).element_id === "string" &&
		typeof (obj as Element).text === "string"
		// typeof (obj as Element).metadata === "object" &&
		// (obj as Element).metadata !== null &&
		// Array.isArray((obj as Element).metadata.languages) &&
		// typeof (obj as Element).metadata.page_number === "number" &&
		// typeof (obj as Element).metadata.filename === "string" &&
		// typeof (obj as Element).metadata.filetype === "string" &&
		// (typeof (obj as Element).metadata.parent_id === "string" ||
		// 	(obj as Element).metadata.parent_id === undefined)
	);
}

export function elementsToMarkdown(elementLikes: unknown[]): string {
	let markdown = "";
	let currentTitle = "";

	for (const elementLike of elementLikes) {
		if (!isElement(elementLike)) {
			continue;
		}
		switch (elementLike.type) {
			case "Title": {
				const titleLevel = currentTitle ? "##" : "#";
				markdown += `${titleLevel} ${elementLike.text}\n\n`;
				currentTitle = elementLike.text;
				break;
			}
			case "Header":
				markdown += `### ${elementLike.text}\n\n`;
				break;
			case "NarrativeText":
			case "UncategorizedText":
				markdown += `${elementLike.text}\n\n`;
				break;
			default:
				// Handle other types if needed
				break;
		}
	}

	return markdown.trim();
}

export function pathJoin(...parts: string[]): string {
	const filteredParts = parts.filter((part) => part !== "");

	const processedParts = filteredParts.map((pathPart, index) => {
		let processed = pathPart;
		if (index > 0) {
			processed = processed.replace(/^\/+/, "");
		}
		if (index < filteredParts.length - 1) {
			processed = processed.replace(/\/+$/, "");
		}
		return processed;
	});

	return processedParts.join("/");
}

export function initGraph(): Graph {
	return {
		id: createGraphId(),
		nodes: [],
		connections: [],
		artifacts: [],
	};
}

export function buildGraphFolderPath(graphId: GraphId) {
	return pathJoin(vercelBlobGraphFolder, graphId);
}
export function buildGraphPath(graphId: GraphId) {
	return pathJoin(buildGraphFolderPath(graphId), "graph.json");
}
