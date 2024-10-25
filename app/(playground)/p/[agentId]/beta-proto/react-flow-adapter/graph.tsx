import {
	type Connection,
	type EdgeChange,
	type NodeChange,
	type OnNodeDrag,
	type OnSelectionChangeFunc,
	applyEdgeChanges,
	applyNodeChanges,
	useOnSelectionChange,
	useReactFlow,
} from "@xyflow/react";
import { type KeyboardEventHandler, useCallback, useEffect } from "react";
import type { ConnectorId } from "../connector/types";
import {
	type GiselleNodeId,
	assertGiselleNodeId,
	panelTabs,
} from "../giselle-node/types";
import {
	addConnector,
	removeSelectedNodesOrFeedback,
	selectNode,
	selectNodeAndSetPanelTab,
	updateNodesUI,
} from "../graph/actions";
import { useGraph } from "../graph/context";
import type { Graph } from "../graph/types";
import { removeConnector } from "../graph/v2/composition/remove-connector";
import { setNodes } from "../graph/v2/node";
import { setXyFlowEdges, setXyFlowNodes } from "../graph/v2/xy-flow";
import {
	type ReactFlowEdge,
	type ReactFlowNode,
	giselleEdgeType,
	giselleNodeType,
} from "./giselle-node";

export function graphToReactFlow(grpah: Graph) {
	const nodes: ReactFlowNode[] = grpah.nodes.map((node) => {
		return {
			id: node.id,
			type: giselleNodeType,
			position: node.ui.position,
			selected: node.ui.selected,
			data: {
				...node,
			},
		};
	});

	const edges: ReactFlowEdge[] = grpah.connectors.map((connector) => {
		return {
			id: connector.id,
			type: giselleEdgeType,
			source: connector.source,
			target: connector.target,
			targetHandle: connector.targetHandle,
			data: connector,
		};
	});

	return {
		nodes,
		edges,
	};
}

export const useReactFlowNodeEventHandler = () => {
	const { state, dispatch } = useGraph();

	const handleNodesChange = useCallback(
		(changes: NodeChange<ReactFlowNode>[]) => {
			dispatch(
				setXyFlowNodes({
					input: {
						xyFlowNodes: applyNodeChanges(changes, state.graph.xyFlow.nodes),
					},
				}),
			);
			changes.map((change) => {
				if (change.type === "select") {
					dispatch(
						updateNodesUI({
							nodes: [
								{
									id: change.id as GiselleNodeId,
									ui: { selected: change.selected },
								},
							],
						}),
					);
				} else if (change.type === "remove") {
					dispatch(
						setNodes({
							input: {
								nodes: state.graph.nodes.filter(
									(node) => node.id !== change.id,
								),
							},
						}),
					);
				}
			});
		},
		[dispatch, state.graph.xyFlow.nodes, state.graph.nodes],
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

export const useGraphToReactFlowEffect = () => {
	const { state, dispatch } = useGraph();
	const reactFlowInstance = useReactFlow();

	useEffect(() => {
		const { nodes, edges } = graphToReactFlow(state.graph);
		reactFlowInstance.setNodes(nodes);
		reactFlowInstance.setEdges(edges);
	}, [reactFlowInstance.setNodes, reactFlowInstance.setEdges, state.graph]);

	const onChange = useCallback<OnSelectionChangeFunc>(
		({ nodes }) => {
			if (nodes.length === 1) {
				dispatch(
					selectNodeAndSetPanelTab({
						selectNode: {
							id: nodes[0].id as GiselleNodeId,
							panelTab: panelTabs.property,
						},
					}),
				);
			} else {
				dispatch(
					selectNode({
						selectedNodeIds: nodes.map((node) => node.id as GiselleNodeId),
					}),
				);
			}
		},
		[dispatch],
	);

	// useOnSelectionChange({
	// 	onChange,
	// });
};

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

export function useKeyUpHandler() {
	const { dispatch } = useGraph();
	const handleKeyUp = useCallback<KeyboardEventHandler>(
		(event) => {
			switch (event.code) {
				case "Backspace": {
					const isInputElement =
						event.target instanceof HTMLInputElement ||
						event.target instanceof HTMLTextAreaElement;

					// Skip the following process if the focus is on the input element.
					if (isInputElement) {
						return;
					}
					dispatch(removeSelectedNodesOrFeedback());
					break;
				}
			}
		},
		[dispatch],
	);

	return {
		handleKeyUp,
	};
}
