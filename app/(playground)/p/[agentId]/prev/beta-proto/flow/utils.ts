import { createId } from "@paralleldrive/cuid2";
import type { ConnectorObject } from "../connector/types";
import { type StructuredData, fileStatuses } from "../files/types";
import { giselleNodeArchetypes } from "../giselle-node/blueprints";
import {
	type GiselleNode,
	type GiselleNodeId,
	giselleNodeCategories,
} from "../giselle-node/types";
import type { Graph } from "../graph/types";
import type { TextContent, TextContentId } from "../text-content/types";
import type { AgentId } from "../types";
import { isModelProvider } from "./server-actions/generate-text";
import { buildStepNode } from "./step-nodes/utils";
import {
	type Artifact,
	type Flow,
	type FlowId,
	type GenerateResult,
	type GenerateResultId,
	type GenerateTextAction,
	type GeneratorNode,
	type InitializingFlow,
	type InitializingFlowIndex,
	type Job,
	type JobId,
	type QueuedFlowIndex,
	type RunningFlowIndex,
	type SearchWebAction,
	type Step,
	type StepId,
	flowStatuses,
	jobStatuses,
	stepStatuses,
} from "./types";

export const createFlowId = (): FlowId => `flw_${createId()}`;
export const createJobId = (): JobId => `jb_${createId()}`;
export const createStepId = (): StepId => `stp_${createId()}`;

function getRelevantConnectors(
	connectors: ConnectorObject[],
	targetNode: GiselleNodeId,
): ConnectorObject[] {
	const relevantConnectors: ConnectorObject[] = [];
	const relevantNodes = new Set<GiselleNodeId>([targetNode]);
	let connectorsToProcess = connectors.filter(
		(connector) => connector.target === targetNode,
	);

	while (connectorsToProcess.length > 0) {
		relevantConnectors.push(...connectorsToProcess);
		const sourceNodes = connectorsToProcess.map(
			(connector) => connector.source,
		);
		for (const node of sourceNodes) {
			relevantNodes.add(node);
		}

		connectorsToProcess = connectors.filter(
			(connector) =>
				!relevantConnectors.includes(connector) &&
				sourceNodes.includes(connector.target),
		);
	}

	return relevantConnectors;
}

function buildDependencyGraph(
	connectors: ConnectorObject[],
): Map<GiselleNodeId, Set<GiselleNodeId>> {
	const dependencyMap = new Map<GiselleNodeId, Set<GiselleNodeId>>();

	for (const connector of connectors) {
		if (connector.sourceNodeCategory === giselleNodeCategories.instruction) {
			continue;
		}
		if (!dependencyMap.has(connector.source)) {
			dependencyMap.set(connector.source, new Set());
		}
		if (!dependencyMap.has(connector.target)) {
			dependencyMap.set(connector.target, new Set());
		}
		dependencyMap.get(connector.target)?.add(connector.source);
	}

	return dependencyMap;
}

export async function resolveJobs(
	nodes: GiselleNode[],
	connectors: ConnectorObject[],
	targetNode: GiselleNodeId,
) {
	const relevantConnectors = getRelevantConnectors(connectors, targetNode);
	const dependencyMap = buildDependencyGraph(relevantConnectors);

	const result: Job[] = [];
	const visited = new Set<GiselleNodeId>();
	const dependencyNodeIds = Array.from(dependencyMap.keys());

	while (visited.size < dependencyNodeIds.length) {
		const currentLayer: GiselleNode[] = [];

		for (const nodeId of dependencyNodeIds) {
			if (!visited.has(nodeId)) {
				const dependencies = dependencyMap.get(nodeId) || new Set();
				const isReady = Array.from(dependencies).every((dep) =>
					visited.has(dep),
				);

				if (isReady) {
					const node = nodes.find((node) => node.id === nodeId);
					if (node !== undefined) {
						currentLayer.push(node);
					}
				}
			}
		}

		if (currentLayer.length === 0 && visited.size < dependencyNodeIds.length) {
			throw new Error("Circular dependency detected");
		}

		for (const node of currentLayer) {
			visited.add(node.id);
		}
		const steps = await Promise.all(
			currentLayer.map(
				async (node) =>
					({
						id: createStepId(),
						object: "step",
						status: stepStatuses.queued,
						node: buildStepNode(node),
						prompt: resolvePrompt(node.id, nodes, relevantConnectors),
						sources: await resolveSources(node.id, nodes, relevantConnectors),
						sourceNodeIds: resolveSourceNodeIds(node.id, connectors),
						...resolveStepAction(node),
					}) satisfies Step,
			),
		);

		result.push({
			id: createJobId(),
			object: "job",
			status: jobStatuses.queued,
			steps,
		});
	}

	return result;
}

function resolvePrompt(
	nodeId: GiselleNodeId,
	nodes: GiselleNode[],
	connectors: ConnectorObject[],
) {
	const connector = connectors.find((connector) => connector.target === nodeId);
	if (connector === undefined) {
		return "";
	}
	const sourceNode = nodes.find((node) => node.id === connector.source);
	if (sourceNode === undefined) {
		return "";
	}
	return sourceNode.output as string;
}

interface BuildFlowInput {
	agentId: AgentId;
	finalNodeId: GiselleNodeId;
	graph: Pick<Graph, "nodes" | "connectors">;
}
export async function buildFlow({ input }: { input: BuildFlowInput }) {
	const jobs = await resolveJobs(
		input.graph.nodes,
		input.graph.connectors,
		input.finalNodeId,
	);
	return {
		id: createFlowId(),
		object: "flow",
		agentId: input.agentId,
		status: flowStatuses.initializing,
		finalNodeId: input.finalNodeId,
		graph: {
			nodes: input.graph.nodes,
			connectors: input.graph.connectors,
		},
		jobs,
		artifacts: [],
		webSearches: [],
	} satisfies InitializingFlow;
}

export async function resolveSources(
	nodeId: GiselleNodeId,
	nodes: GiselleNode[],
	connectors: ConnectorObject[],
) {
	const connector = connectors.find((connector) => connector.target === nodeId);
	if (connector === undefined) {
		return [];
	}
	const sourceNode = nodes.find((node) => node.id === connector.source);
	if (sourceNode === undefined) {
		return [];
	}
	if (!Array.isArray(sourceNode.properties.sources)) {
		return [];
	}
	return await Promise.all(
		sourceNode.properties.sources.map(async (source) => {
			if (
				typeof source !== "object" ||
				source === null ||
				typeof source.id !== "string" ||
				typeof source.object !== "string"
			) {
				return null;
			}
			if (source.object === "textContent") {
				return {
					id: source.id as TextContentId,
					object: "textContent",
					title: source.title as string,
					content: source.content as string,
				} satisfies TextContent;
			}
			if (source.object === "file") {
				if (
					typeof source.status !== "string" ||
					source.status !== fileStatuses.processed ||
					typeof source.structuredDataBlobUrl !== "string" ||
					typeof source.name !== "string"
				) {
					return null;
				}
				const structuredData = await fetch(source.structuredDataBlobUrl).then(
					(res) => res.text(),
				);
				return {
					id: source.id,
					title: source.name,
					object: "file",
					content: structuredData,
				} satisfies StructuredData;
			}
			return null;
		}),
	).then((sources) => sources.filter((source) => source != null));
}

export function resolveSourceNodeIds(
	nodeId: GiselleNodeId,
	connectors: ConnectorObject[],
) {
	return connectors
		.filter(
			(connector) =>
				connector.target === nodeId &&
				connector.sourceNodeCategory === giselleNodeCategories.action,
		)
		.map((connector) => connector.source);
}

export function buildFlowIndex({ input }: { input: Flow }) {
	if (input.status === flowStatuses.initializing) {
		return {
			object: "flow.index",
			id: input.id,
			status: flowStatuses.initializing,
		} satisfies InitializingFlowIndex;
	}
	if (input.status === flowStatuses.queued) {
		return {
			object: "flow.index",
			id: input.id,
			status: flowStatuses.queued,
		} satisfies QueuedFlowIndex;
	}
	if (input.status === flowStatuses.running) {
		return {
			object: "flow.index",
			id: input.id,
			status: flowStatuses.running,
			dataUrl: input.dataUrl,
		} satisfies RunningFlowIndex;
	}
	throw new Error("Invalid flow status");
}

export interface BuildGeneratorNodeInput {
	nodeId: GiselleNodeId;
	name: string;
	archetype: string;
}
export function buildGeneratorNode(
	input: BuildGeneratorNodeInput,
): GeneratorNode {
	return {
		nodeId: input.nodeId,
		object: "generator-node",
		name: input.name,
		archetype: input.archetype,
	};
}
function createGenerateResultId(): GenerateResultId {
	return `gnr_${createId()}`;
}
interface BuildGenerateResultInput {
	generator: GeneratorNode;
	artifact: Artifact;
}
export function buildGenerateResult(
	input: BuildGenerateResultInput,
): GenerateResult {
	return {
		id: createGenerateResultId(),
		object: "generate-result",
		generator: input.generator,
		artifact: input.artifact,
	};
}

export function resolveStepAction(node: GiselleNode) {
	if (node.archetype === giselleNodeArchetypes.textGenerator) {
		if (
			node.properties !== null &&
			typeof node.properties === "object" &&
			"llm" in node.properties &&
			typeof node.properties.llm === "string"
		) {
			const [provider, modelId] = node.properties.llm.split(":");
			if (isModelProvider(provider) && typeof modelId === "string") {
				return {
					action: "generate-text",
					modelConfiguration: {
						provider,
						modelId,
						temperature: 0.7,
						topP: 0.8,
					},
				} satisfies GenerateTextAction;
			}
		}
		return {
			action: "generate-text",
			modelConfiguration: {
				provider: "openai",
				modelId: "gpt-4o-mini",
				temperature: 0.7,
				topP: 0.8,
			},
		} satisfies GenerateTextAction;
	}
	if (node.archetype === giselleNodeArchetypes.webSearch) {
		return {
			action: "search-web",
		} satisfies SearchWebAction;
	}
	throw new Error(`Detect invalid archetype: ${node.archetype}`);
}

export function allFlowEdges(
	nodes: GiselleNode[],
	connectors: ConnectorObject[],
) {
	const graph: Record<GiselleNodeId, GiselleNodeId[]> = {};
	for (const connector of connectors) {
		if (!graph[connector.source]) {
			graph[connector.source] = [];
		}
		graph[connector.source].push(connector.target);
	}

	const endNodes = nodes
		.filter((node) => node.isFinal === true)
		.map((node) => node.id);

	const flows: { start: GiselleNodeId; end: GiselleNodeId }[] = [];

	function findPaths(
		current: GiselleNodeId,
		visited: Set<GiselleNodeId>,
		path: GiselleNodeId[],
	) {
		path.push(current);
		visited.add(current);

		if (endNodes.includes(current)) {
			flows.push({
				start: path[0],
				end: current,
			});
		}

		if (graph[current]) {
			for (const next of graph[current]) {
				if (!visited.has(next)) {
					findPaths(next, new Set(visited), [...path]);
				}
			}
		}
	}

	const startNodes = new Set(
		nodes.filter((node) => node.category === "action").map((node) => node.id),
	);
	for (const connector of connectors.filter(
		(connector) => connector.sourceNodeCategory === "action",
	)) {
		startNodes.delete(connector.target);
	}

	for (const startNode of startNodes) {
		findPaths(startNode, new Set(), []);
	}

	return flows;
}
