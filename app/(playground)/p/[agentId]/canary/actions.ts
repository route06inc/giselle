"use server";

import { toJsonSchema } from "@valibot/to-json-schema";
import { put } from "@vercel/blob";
import { jsonSchema, streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";
import HandleBars from "handlebars";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import * as v from "valibot";
import { vercelBlobFileFolder, vercelBlobGraphFolder } from "./constants";
import { textGenerationPrompt } from "./prompts";
import type {
	FileId,
	Graph,
	GraphId,
	NodeHandle,
	NodeHandleId,
	NodeId,
	TextArtifactObject,
	TextGenerateActionContent,
} from "./types";
import {
	buildGraphPath,
	elementsToMarkdown,
	pathJoin,
	resolveLanguageModel,
} from "./utils";

const artifactSchema = v.object({
	plan: v.pipe(
		v.string(),
		v.description(
			"How you think about the content of the artefact (purpose, structure, essentials) and how you intend to output it",
		),
	),
	title: v.pipe(v.string(), v.description("The title of the artefact")),
	content: v.pipe(
		v.string(),
		v.description("The content of the artefact formatted markdown."),
	),
	description: v.pipe(
		v.string(),
		v.description(
			"Explanation of the Artifact and what the intention was in creating this Artifact. Add any suggestions for making it even better.",
		),
	),
});

interface ActionSourceBase {
	type: string;
	nodeId: NodeId;
}

interface TextSource extends ActionSourceBase {
	type: "text";
	content: string;
}
interface TextGenerationSource extends ActionSourceBase {
	type: "textGeneration";
	title: string;
	content: string;
}

type ActionSource = TextSource | TextGenerationSource;

export async function action(graphUrl: string, nodeId: NodeId) {
	const graph = await fetch(graphUrl).then(
		(res) => res.json() as unknown as Graph,
	);
	const node = graph.nodes.find((node) => node.id === nodeId);
	if (node === undefined) {
		throw new Error("Node not found");
	}

	/**
	 * This function is a helper that retrieves a node from the graph
	 * based on its NodeHandleId. It looks for a connection in the
	 * graph that matches the provided handleId and returns the
	 * corresponding node if found, or null if no such node exists.
	 */
	function findNode(handleId: NodeHandleId) {
		const connection = graph.connections.find(
			(connection) => connection.targetNodeHandleId === handleId,
		);
		const node = graph.nodes.find(
			(node) => node.id === connection?.sourceNodeId,
		);
		if (node === undefined) {
			return null;
		}
		return node;
	}

	/**
	 * The resolveSources function maps over an array of NodeHandles,
	 * finds the corresponding nodes in the graph, and returns an
	 * array of ActionSources. It handles both text and text generation
	 * sources and filters out any null results. If a text node is
	 * found, it extracts the text content; if a textGeneration node
	 * is found, it retrieves the corresponding generatedArtifact.
	 */
	function resolveSources(sources: NodeHandle[]) {
		return sources
			.map((source) => {
				const node = findNode(source.id);
				switch (node?.content.type) {
					case "text":
						return {
							type: "text",
							content: node.content.text,
							nodeId: node.id,
						} satisfies ActionSource;
					case "textGeneration": {
						const generatedArtifact = graph.artifacts.find(
							(artifact) => artifact.creatorNodeId === node.id,
						);
						if (
							generatedArtifact === undefined ||
							generatedArtifact.type === "generatedArtifact"
						) {
							return null;
						}
						return {
							type: "textGeneration",
							title: generatedArtifact.object.title,
							content: generatedArtifact.object.content,
							nodeId: node.id,
						} satisfies ActionSource;
					}
					default:
						return null;
				}
			})
			.filter((actionSource) => actionSource !== null);
	}

	/**
	 * The resolveRequirement function retrieves the content of a
	 * specified requirement node, if it exists. It looks for
	 * the node in the graph based on the given NodeHandle.
	 * If the node is of type "text", it returns the text
	 * content; if it is of type "textGeneration", it looks
	 * for the corresponding generated artifact and returns
	 * its content. If the node is not found or does not match
	 * the expected types, it returns null.
	 */
	function resolveRequirement(requirement?: NodeHandle) {
		if (requirement === undefined) {
			return null;
		}
		const node = findNode(requirement.id);
		switch (node?.content.type) {
			case "text":
				return node.content.text;
			case "textGeneration": {
				const generatedArtifact = graph.artifacts.find(
					(artifact) => artifact.creatorNodeId === node.id,
				);
				if (
					generatedArtifact === undefined ||
					generatedArtifact.type === "generatedArtifact"
				) {
					return null;
				}
				return generatedArtifact.object.content;
			}
			default:
				return null;
		}
	}

	// The main switch statement handles the different types of nodes
	switch (node.content.type) {
		case "textGeneration": {
			const actionSources = resolveSources(node.content.sources);
			const requirement = resolveRequirement(node.content.requirement);
			const model = resolveLanguageModel(node.content.llm);
			const promptTemplate = HandleBars.compile(textGenerationPrompt);
			const prompt = promptTemplate({
				instruction: node.content.instruction,
				requirement,
			});
			const topP = node.content.topP;
			const temperature = node.content.temperature;
			const stream = createStreamableValue<TextArtifactObject>();
			(async () => {
				const { partialObjectStream } = await streamObject({
					model,
					prompt,
					schema: jsonSchema<v.InferInput<typeof artifactSchema>>(
						toJsonSchema(artifactSchema),
					),
					topP,
					temperature,
				});

				for await (const partialObject of partialObjectStream) {
					stream.update({
						type: "text",
						title: partialObject.title ?? "",
						content: partialObject.content ?? "",
						messages: {
							plan: partialObject.plan ?? "",
							description: partialObject.description ?? "",
						},
					});
				}
				stream.done();
			})();
			return stream.value;
		}
		default:
			throw new Error("Invalid node type");
	}
}

export async function parse(id: FileId, name: string, blobUrl: string) {
	if (process.env.UNSTRUCTURED_API_KEY === undefined) {
		throw new Error("UNSTRUCTURED_API_KEY is not set");
	}
	const client = new UnstructuredClient({
		security: {
			apiKeyAuth: process.env.UNSTRUCTURED_API_KEY,
		},
	});
	const response = await fetch(blobUrl);
	const content = await response.blob();
	const partitionResponse = await client.general.partition({
		partitionParameters: {
			files: {
				fileName: name,
				content,
			},
			strategy: Strategy.Fast,
			splitPdfPage: false,
			splitPdfConcurrencyLevel: 1,
		},
	});
	if (partitionResponse.statusCode !== 200) {
		console.error(partitionResponse.rawResponse);
		throw new Error(`Failed to parse file: ${partitionResponse.statusCode}`);
	}
	const jsonString = JSON.stringify(partitionResponse.elements, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });

	await put(pathJoin(vercelBlobFileFolder, id, "partition.json"), blob, {
		access: "public",
		contentType: blob.type,
	});

	const markdown = elementsToMarkdown(partitionResponse.elements ?? []);
	const markdownBlob = new Blob([markdown], { type: "text/markdown" });
	const vercelBlob = await put(
		pathJoin(vercelBlobFileFolder, id, "markdown.md"),
		markdownBlob,
		{
			access: "public",
			contentType: markdownBlob.type,
		},
	);

	return vercelBlob;
}

export async function putGraph(graph: Graph) {
	return await put(buildGraphPath(graph.id), JSON.stringify(graph), {
		access: "public",
	});
}
