import type {
	Connection,
	ConnectionId,
	Files,
	Flow,
	Graph,
	Job,
	LatestGraphVersion,
	Node,
	NodeId,
	Step,
} from "../types";
import { createFlowId, createJobId, createStepId } from "./utils";

export function deriveFlows(graph: Graph): Flow[] {
	const processedNodes = new Set<NodeId>();
	const flows: Flow[] = [];
	const connectionMap = new Map<NodeId, Set<NodeId>>();
	const nodeIds = new Set<NodeId>(graph.nodes.map((node) => node.id));

	for (const connection of graph.connections) {
		if (
			!nodeIds.has(connection.sourceNodeId) ||
			!nodeIds.has(connection.targetNodeId)
		) {
			continue;
		}
		if (!connectionMap.has(connection.sourceNodeId)) {
			connectionMap.set(connection.sourceNodeId, new Set());
		}
		const sourceSet = connectionMap.get(connection.sourceNodeId);
		if (sourceSet) {
			sourceSet.add(connection.targetNodeId);
		}

		if (!connectionMap.has(connection.targetNodeId)) {
			connectionMap.set(connection.targetNodeId, new Set());
		}
		const targetSet = connectionMap.get(connection.targetNodeId);
		if (targetSet) {
			targetSet.add(connection.sourceNodeId);
		}
	}

	function findConnectedComponent(startNodeId: NodeId): Set<NodeId> {
		const connectedNodes = new Set<NodeId>();
		const stack: NodeId[] = [startNodeId];

		while (stack.length > 0) {
			const currentNodeId = stack.pop() || startNodeId;
			if (connectedNodes.has(currentNodeId)) continue;

			connectedNodes.add(currentNodeId);

			const connectedNodeIds = connectionMap.get(currentNodeId);
			if (connectedNodeIds) {
				for (const connectedNodeId of connectedNodeIds) {
					if (!connectedNodes.has(connectedNodeId)) {
						stack.push(connectedNodeId);
					}
				}
			}
		}

		return connectedNodes;
	}
	function findFlowConnections(nodes: Set<NodeId>): Set<ConnectionId> {
		const flowConnections = new Set<ConnectionId>();

		for (const connection of graph.connections) {
			if (
				nodes.has(connection.sourceNodeId) &&
				nodes.has(connection.targetNodeId)
			) {
				flowConnections.add(connection.id);
			}
		}

		return flowConnections;
	}
	/**
	 * Converts a directed graph into a sequence of jobs with steps based on topological sorting.
	 *
	 * Input Graph:          Output Jobs:
	 * A → B → D             Job1: [A]
	 * ↓   ↓                 Job2: [B, C]
	 * C → E                 Job3: [D, E]
	 *
	 * @param graph The input graph with nodes and connections
	 * @returns Array of jobs where each job contains steps that can be executed in parallel
	 */
	function createJobsFromGraph(
		nodes: Node[],
		connections: Connection[],
	): Job[] {
		/**
		 * Calculates the number of incoming edges for each node.
		 *
		 * Example:
		 * A → B → C
		 * ↓   ↓
		 * D → E
		 *
		 * Results:
		 * A: 0
		 * B: 1
		 * C: 1
		 * D: 1
		 * E: 2
		 */
		const calculateInDegrees = (
			nodeIds: NodeId[],
			connections: Connection[],
		): Map<string, number> => {
			const inDegrees = new Map<string, number>();

			for (const nodeId of nodeIds) {
				inDegrees.set(nodeId, 0);
			}

			for (const conn of connections) {
				const currentDegree = inDegrees.get(conn.targetNodeId) || 0;
				inDegrees.set(conn.targetNodeId, currentDegree + 1);
			}

			return inDegrees;
		};

		/**
		 * Gets all direct child nodes of a given node.
		 *
		 * Example:
		 * For node A in:
		 * A → B
		 * ↓
		 * C
		 *
		 * Returns: [B, C]
		 */
		const getChildNodes = (
			nodeId: NodeId,
			connections: Connection[],
		): string[] => {
			return connections
				.filter((conn) => conn.sourceNodeId === nodeId)
				.map((conn) => conn.targetNodeId);
		};

		/**
		 * Performs topological sort and groups nodes by levels.
		 *
		 * Example graph:       Result levels:
		 * A → B → D            Level 1: [A]
		 * ↓   ↓                Level 2: [B, C]
		 * C → E                Level 3: [D, E]
		 *
		 * Each level contains nodes that can be processed in parallel
		 */
		const topologicalSort = (
			nodeIds: NodeId[],
			connections: Connection[],
		): NodeId[][] => {
			const inDegrees = calculateInDegrees(nodeIds, connections);
			const levels: NodeId[][] = [];
			let currentLevel: NodeId[] = [];

			for (const nodeId of nodeIds) {
				if (inDegrees.get(nodeId) === 0) {
					currentLevel.push(nodeId);
				}
			}

			while (currentLevel.length > 0) {
				levels.push([...currentLevel]);
				const nextLevel: NodeId[] = [];

				for (const nodeId of currentLevel) {
					const children = getChildNodes(nodeId, connections);
					for (const childId of children) {
						const newDegree = (inDegrees.get(childId) || 0) - 1;
						inDegrees.set(childId, newDegree);
						if (newDegree === 0) {
							nextLevel.push(childId as NodeId);
						}
					}
				}

				currentLevel = nextLevel;
			}

			return levels;
		};

		function resolveVariableNodeIds(nodeId: NodeId) {
			const variableConnections = new Set(
				connections
					.filter(
						(connection) =>
							connection.targetNodeId === nodeId &&
							connection.sourceNodeType === "variable",
					)
					.map((connection) => connection.sourceNodeId),
			);
			const variableNodes = nodes.filter((node) =>
				variableConnections.has(node.id),
			);
			return variableNodes.map((node) => node.id);
		}

		const actionNodeIds = nodes
			.filter((node) => node.type === "action")
			.map((node) => node.id);
		const levels = topologicalSort(
			actionNodeIds,
			connections.filter(
				(connection) => connection.sourceNodeType === "action",
			),
		);
		return levels.map(
			(level) =>
				({
					id: createJobId(),
					steps: level.map(
						(nodeId) =>
							({
								nodeId,
								id: createStepId(),
								variableNodeIds: resolveVariableNodeIds(nodeId),
							}) satisfies Step,
					),
				}) satisfies Job,
		);
	}

	for (const node of graph.nodes.filter((node) => node.type === "action")) {
		if (processedNodes.has(node.id)) continue;

		const connectedNodes = findConnectedComponent(node.id);

		if (connectedNodes.size > 0) {
			const flowConnections = findFlowConnections(connectedNodes);

			const flow: Flow = {
				id: createFlowId(),
				name: `Flow ${flows.length + 1}`,
				nodes: Array.from(connectedNodes),
				connections: Array.from(flowConnections),
				jobs: createJobsFromGraph(
					graph.nodes.filter((node) => connectedNodes.has(node.id)),
					graph.connections.filter((connection) =>
						flowConnections.has(connection.id),
					),
				),
			};

			flows.push(flow);

			for (const nodeId of connectedNodes) {
				processedNodes.add(nodeId);
			}
		} else {
			const flow: Flow = {
				id: createFlowId(),
				name: `Flow ${flows.length + 1}`,
				nodes: [node.id],
				connections: [],
				jobs: createJobsFromGraph([node], []),
			};

			flows.push(flow);
			processedNodes.add(node.id);
		}
	}

	return flows;
}

export function isLatestVersion(graph: Graph): boolean {
	const latestGraphVersion = "20241217" satisfies LatestGraphVersion;
	return graph.version === latestGraphVersion;
}

export function migrateGraph(graph: Graph): Graph {
	let newGraph = graph;
	// @ts-ignore: Old graph has no version field
	if (typeof graph.version === "undefined") {
		newGraph = {
			...newGraph,
			version: "2024-12-09",
			flows: deriveFlows(newGraph),
		};
	}

	if (newGraph.version === "2024-12-09") {
		newGraph = {
			...newGraph,
			version: "2024-12-10",
			nodes: newGraph.nodes
				.map((node) => {
					if (node.content.type !== "file") {
						return node;
					}
					if (node.content.data == null) {
						return null;
					}
					return {
						...node,
						type: "variable",
						content: {
							type: "files",
							data: [node.content.data],
						},
					} satisfies Files;
				})
				.filter((node) => node !== null),
		};
	}

	if (
		newGraph.version === "2024-12-10" ||
		newGraph.version === "2024-12-11" ||
		newGraph.version === "20241212"
	) {
		newGraph = {
			...newGraph,
			version: "20241213",
			flows: deriveFlows(newGraph),
			executionIndexes: [],
		};
	}

	if (newGraph.version === "20241213") {
		newGraph = {
			...newGraph,
			flows: deriveFlows(newGraph),
			version: "20241217",
		};
	}

	return newGraph;
}
