import {
	type Connection,
	type EdgeChange,
	type NodeChange,
	type OnNodeDrag,
	applyEdgeChanges,
	applyNodeChanges,
} from "@xyflow/react";
import { useCallback } from "react";
import type { ConnectorId } from "../connector/types";
import { type GiselleNodeId, assertGiselleNodeId } from "../giselle-node/types";
import { addConnector, updateNodesUI } from "../graph/actions";
import { useGraph } from "../graph/context";
import { removeConnector } from "../graph/v2/composition/remove-connector";
import { removeNode } from "../graph/v2/composition/remove-node";
import { updateNode } from "../graph/v2/composition/update-node";
import { setXyFlowEdges, setXyFlowNodes } from "../graph/v2/xy-flow";
import type { ReactFlowEdge, ReactFlowNode } from "./types";

export const useReactFlowNodeEventHandler = () => {
	const { state, dispatch } = useGraph();

	const handleNodesChange = useCallback(
		(changes: NodeChange<ReactFlowNode>[]) => {
			const filteredChanges = changes.filter(
				(change) =>
					change.type !== "remove" &&
					change.type !== "select" &&
					change.type !== "position",
			);
			if (filteredChanges.length > 0) {
				dispatch(
					setXyFlowNodes({
						input: {
							xyFlowNodes: applyNodeChanges(
								filteredChanges,
								state.graph.xyFlow.nodes,
							),
						},
					}),
				);
			}
			changes.map((change) => {
				if (change.type === "select") {
					dispatch(
						updateNode({
							input: {
								nodeId: change.id as GiselleNodeId,
								ui: { selected: change.selected },
							},
						}),
					);
				} else if (change.type === "position") {
					dispatch(
						updateNode({
							input: {
								nodeId: change.id as GiselleNodeId,
								ui: { position: change.position },
							},
						}),
					);
				} else if (change.type === "remove") {
					dispatch(
						removeNode({
							input: {
								nodeId: change.id as GiselleNodeId,
							},
						}),
					);
				}
			});
		},
		[dispatch, state.graph.xyFlow.nodes],
	);
	return { handleNodesChange };
};

export function useReacrFlowEdgeEventHandler() {
	const { state, dispatch } = useGraph();

	const handleEdgesChange = useCallback(
		(changes: EdgeChange<ReactFlowEdge>[]) => {
			dispatch(
				setXyFlowEdges({
					input: {
						xyFlowEdges: applyEdgeChanges(changes, state.graph.xyFlow.edges),
					},
				}),
			);
			changes.map((change) => {
				if (change.type === "remove") {
					dispatch(
						removeConnector({
							input: {
								connectorId: change.id as ConnectorId,
							},
						}),
					);
				}
			});
		},
		[dispatch, state.graph.xyFlow.edges],
	);

	return { handleEdgesChange };
}

type GiselleConnection = {
	source: GiselleNodeId;
	sourceHandle: string | null;
	target: GiselleNodeId;
	targetHandle: string;
};
function assertConnection(
	connection: Connection,
): asserts connection is GiselleConnection {
	assertGiselleNodeId(connection.source);
	assertGiselleNodeId(connection.target);
}

export const useConnectionHandler = () => {
	const { state, dispatch } = useGraph();

	const handleConnect = useCallback(
		(connection: Connection) => {
			assertConnection(connection);
			const sourceNode = state.graph.nodes.find(
				(node) => node.id === connection.source,
			);
			const targetNode = state.graph.nodes.find(
				(node) => node.id === connection.target,
			);
			if (sourceNode == null || targetNode == null) {
				return;
			}
			dispatch(
				addConnector({
					sourceNode: {
						id: sourceNode.id,
						category: sourceNode.category,
						archetype: sourceNode.archetype,
					},
					targetNode: {
						id: targetNode.id,
						handle: connection.targetHandle,
						category: targetNode?.category,
						archetype: targetNode?.archetype,
					},
				}),
			);
		},
		[dispatch, state.graph.nodes],
	);

	return {
		handleConnect,
	};
};

export const useNodeEventHandler = () => {
	const { dispatch } = useGraph();

	const handleNodeDragStop = useCallback<OnNodeDrag<ReactFlowNode>>(
		(_event, _node, nodes) => {
			dispatch(
				updateNodesUI({
					nodes: nodes.map((node) => ({
						id: node.id as GiselleNodeId,
						ui: { position: node.position },
					})),
				}),
			);
		},
		[dispatch],
	);

	return {
		handleNodeDragStop,
	};
};
