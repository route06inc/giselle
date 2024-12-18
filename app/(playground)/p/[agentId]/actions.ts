"use server";

import { db } from "@/drizzle";
import {
	createLogger,
	waitForTelemetryExport,
	withTokenMeasurement,
} from "@/lib/opentelemetry";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { toJsonSchema } from "@valibot/to-json-schema";
import { del, list, put } from "@vercel/blob";
import { type LanguageModelV1, jsonSchema, streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";
import HandleBars from "handlebars";
import Langfuse from "langfuse";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import * as v from "valibot";
import { vercelBlobFileFolder, vercelBlobGraphFolder } from "./constants";

import { textGenerationPrompt } from "./lib/prompts";
import {
	buildFileFolderPath,
	buildGraphPath,
	elementsToMarkdown,
	langfuseModel,
	pathJoin,
	toErrorWithMessage,
} from "./lib/utils";
import type {
	AgentId,
	ArtifactId,
	FileData,
	FileId,
	Graph,
	GraphId,
	NodeHandle,
	NodeHandleId,
	NodeId,
	TextArtifactObject,
	TextGenerateActionContent,
} from "./types";

function resolveLanguageModel(
	llm: TextGenerateActionContent["llm"],
): LanguageModelV1 {
	const [provider, model] = llm.split(":");
	if (provider === "openai") {
		return openai(model);
	}
	if (provider === "anthropic") {
		return anthropic(model);
	}
	if (provider === "google") {
		return google(model);
	}
	if (provider === "dev") {
		return new MockLanguageModelV1({
			defaultObjectGenerationMode: "json",
			doStream: async () => ({
				stream: simulateReadableStream({
					chunks: [{ type: "error", error: "a" }],
				}),
				rawCall: { rawPrompt: null, rawSettings: {} },
			}),
		});
	}
	throw new Error("Unsupported model provider");
}

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
interface FileSource extends ActionSourceBase {
	type: "file";
	title: string;
	content: string;
}
interface TextGenerationSource extends ActionSourceBase {
	type: "textGeneration";
	title: string;
	content: string;
}

type ActionSource = TextSource | TextGenerationSource | FileSource;

export async function action(
	artifactId: ArtifactId,
	agentId: AgentId,
	nodeId: NodeId,
) {
	const startTime = performance.now();
	const lf = new Langfuse();
	const trace = lf.trace({
		sessionId: artifactId,
	});

	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.id, agentId),
	});
	if (agent === undefined || agent.graphUrl === null) {
		throw new Error(`Agent with id ${agentId} not found`);
	}

	const graph = await fetch(agent.graphUrl).then(
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
	async function resolveSources(sources: NodeHandle[]) {
		return Promise.all(
			sources.map(async (source) => {
				const node = findNode(source.id);
				switch (node?.content.type) {
					case "text":
						return {
							type: "text",
							content: node.content.text,
							nodeId: node.id,
						} satisfies ActionSource;
					case "file": {
						if (node.content.data == null) {
							throw new Error("File not found");
						}
						if (node.content.data.status === "uploading") {
							/** @todo Let user know file is uploading*/
							throw new Error("File is uploading");
						}
						if (node.content.data.status === "processing") {
							/** @todo Let user know file is processing*/
							throw new Error("File is processing");
						}
						if (node.content.data.status === "failed") {
							return null;
						}
						const text = await fetch(node.content.data.textDataUrl).then(
							(res) => res.text(),
						);
						return {
							type: "file",
							title: node.content.data.name,
							content: text,
							nodeId: node.id,
						} satisfies ActionSource;
					}

					case "files": {
						return await Promise.all(
							node.content.data.map(async (file) => {
								if (file == null) {
									throw new Error("File not found");
								}
								if (file.status === "uploading") {
									/** @todo Let user know file is uploading*/
									throw new Error("File is uploading");
								}
								if (file.status === "processing") {
									/** @todo Let user know file is processing*/
									throw new Error("File is processing");
								}
								if (file.status === "failed") {
									return null;
								}
								const text = await fetch(file.textDataUrl).then((res) =>
									res.text(),
								);
								return {
									type: "file",
									title: file.name,
									content: text,
									nodeId: node.id,
								} satisfies ActionSource;
							}),
						);
					}
					case "textGeneration": {
						const generatedArtifact = graph.artifacts.find(
							(artifact) => artifact.creatorNodeId === node.id,
						);
						if (
							generatedArtifact === undefined ||
							generatedArtifact.type !== "generatedArtifact"
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
			}),
		).then((sources) => sources.filter((source) => source !== null).flat());
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
			const actionSources = await resolveSources(node.content.sources);
			const requirement = resolveRequirement(node.content.requirement);
			const model = resolveLanguageModel(node.content.llm);
			const promptTemplate = HandleBars.compile(
				node.content.system ?? textGenerationPrompt,
			);
			const prompt = promptTemplate({
				instruction: node.content.instruction,
				requirement,
				sources: actionSources,
			});
			const topP = node.content.topP;
			const temperature = node.content.temperature;
			const stream = createStreamableValue<TextArtifactObject>();

			const generationTracer = trace.generation({
				name: "generate-text",
				input: prompt,
				model: langfuseModel(node.content.llm),
				modelParameters: {
					topP: node.content.topP,
					temperature: node.content.temperature,
				},
			});
			(async () => {
				const { partialObjectStream, object, usage } = streamObject({
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
				const result = await object;

				await withTokenMeasurement(
					createLogger(node.content.type),
					async () => {
						generationTracer.end({ output: result });
						await lf.shutdownAsync();
						waitForTelemetryExport();
						return { usage: await usage };
					},
					model,
					startTime,
				);
				stream.done();
			})().catch((error) => {
				stream.error(error);
			});
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

export async function remove(fileData: FileData) {
	const blobList = await list({
		prefix: buildFileFolderPath(fileData.id),
	});

	if (blobList.blobs.length > 0) {
		await del(blobList.blobs.map((blob) => blob.url));
	}
}
