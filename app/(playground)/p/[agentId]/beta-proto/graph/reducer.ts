import { isV2FlowAction, v2FlowReducer } from "../flow/action";
import type { GraphAction } from "./actions";
import type { GraphState } from "./types";
import { isV2ModeAction, v2ModeReducer } from "./v2/mode";
import { isV2NodeAction, v2NodeReducer } from "./v2/node";
import { isV2XyFlowAction, v2XyFlowReducer } from "./v2/xy-flow";

export const graphReducer = (
	state: GraphState,
	action: GraphAction,
): GraphState => {
	if (isV2NodeAction(action)) {
		return {
			...state,
			graph: {
				...state.graph,
				nodes: v2NodeReducer(state.graph.nodes, action),
			},
		};
	}
	if (isV2ModeAction(action)) {
		return {
			...state,
			graph: {
				...state.graph,
				mode: v2ModeReducer(state.graph.mode, action),
			},
		};
	}
	if (isV2FlowAction(action)) {
		return {
			...state,
			graph: {
				...state.graph,
				flow: v2FlowReducer(state.graph.flow, action),
			},
		};
	}
	if (isV2XyFlowAction(action)) {
		return {
			...state,
			graph: {
				...state.graph,
				xyFlow: v2XyFlowReducer(state.graph.xyFlow, action),
			},
		};
	}
	switch (action.type) {
		case "addNode":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: [...state.graph.nodes, action.payload.node],
				},
			};
		case "addConnector":
			return {
				...state,
				graph: {
					...state.graph,
					connectors: [...state.graph.connectors, action.payload.connector],
				},
			};
		case "selectNode":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) => ({
						...node,
						ui: {
							...node.ui,
							selected: action.payload.selectedNodeIds.includes(node.id),
						},
					})),
				},
			};
		case "setPanelTab":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) => ({
						...node,
						ui: {
							...node.ui,
							panelTab:
								node.id === action.payload.node.id
									? action.payload.node.panelTab
									: node.ui.panelTab,
						},
					})),
				},
			};

		case "updateNodeProperties":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) => {
						if (action.payload.node.id !== node.id) {
							return node;
						}
						return {
							...node,
							properties: {
								...node.properties,
								[action.payload.node.property.key]:
									action.payload.node.property.value,
							},
						};
					}),
				},
			};
		case "updateNodesUI":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((currentNode) => {
						const updateNode = action.payload.nodes.find(
							(payloadNode) => payloadNode.id === currentNode.id,
						);
						if (updateNode == null) {
							return currentNode;
						}
						return {
							...currentNode,
							ui: {
								...currentNode.ui,
								...updateNode.ui,
							},
						};
					}),
				},
			};
		case "updateNodeState":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) => ({
						...node,
						state:
							node.id === action.payload.node.id
								? action.payload.node.state
								: node.state,
					})),
				},
			};

		case "setNodeOutput":
		case "setTextGenerationNodeOutput":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) =>
						node.id !== action.payload.node.id
							? node
							: {
									...node,
									output: action.payload.node.output,
								},
					),
				},
			};
		case "addOrReplaceArtifact": {
			const replace = state.graph.artifacts.some(
				(artifact) => artifact.id === action.payload.artifact.id,
			);
			if (replace) {
				return {
					...state,
					graph: {
						...state.graph,
						artifacts: [
							...state.graph.artifacts.filter(
								(artifact) => artifact.id !== action.payload.artifact.id,
							),
							action.payload.artifact,
						],
					},
				};
			}
			return {
				...state,
				graph: {
					...state.graph,
					artifacts: [...state.graph.artifacts, action.payload.artifact],
				},
			};
		}
		case "addParameterToNode":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) =>
						node.id !== action.payload.node.id
							? node
							: {
									...node,
									parameters:
										node.parameters?.object === "objectParameter"
											? {
													...node.parameters,
													properties: {
														...node.parameters.properties,
														[action.payload.parameter.key]:
															action.payload.parameter.value,
													},
												}
											: node.parameters,
								},
					),
				},
			};
		case "removeParameterFromNode":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.map((node) =>
						node.id !== action.payload.node.id
							? node
							: {
									...node,
									parameters:
										node.parameters?.object === "objectParameter"
											? {
													...node.parameters,
													properties: Object.fromEntries(
														Object.entries(node.parameters.properties).filter(
															([key]) => key !== action.payload.parameter.key,
														),
													),
												}
											: node.parameters,
								},
					),
				},
			};
		case "removeConnector":
			return {
				...state,
				graph: {
					...state.graph,
					connectors: state.graph.connectors.filter(
						(connector) => connector.id !== action.payload.connector.id,
					),
				},
			};
		case "removeNode":
			return {
				...state,
				graph: {
					...state.graph,
					nodes: state.graph.nodes.filter(
						(node) => node.id !== action.payload.node.id,
					),
				},
			};
		case "upsertWebSearch": {
			const isUpdate = state.graph.webSearches.some(
				(webSearch) =>
					webSearch.generatorNode.id ===
					action.inputs.webSearch.generatorNode.id,
			);
			return {
				...state,
				graph: {
					...state.graph,
					webSearches: isUpdate
						? state.graph.webSearches.map((webSearch) =>
								webSearch.generatorNode.id !==
								action.inputs.webSearch.generatorNode.id
									? webSearch
									: action.inputs.webSearch,
							)
						: [...state.graph.webSearches, action.inputs.webSearch],
				},
			};
		}
		default:
			return state;
	}
};
