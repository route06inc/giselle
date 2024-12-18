import { isV2ConnectorAction, v2ConnectorReducer } from "../connector/actions";
import {
	isV2FlowAction,
	isV2FlowIndexAction,
	v2FlowIndexReducer,
	v2FlowReducer,
} from "../flow/action";
import { isV2NodeAction, v2NodeReducer } from "../giselle-node/actions";
import type { GraphAction } from "./actions";
import type { GraphState } from "./types";
import { isV2ModeAction, v2ModeReducer } from "./v2/mode";
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
	if (isV2FlowIndexAction(action)) {
		return {
			...state,
			graph: {
				...state.graph,
				flowIndexes: v2FlowIndexReducer(state.graph.flowIndexes, action),
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
	if (isV2ConnectorAction(action)) {
		return {
			...state,
			graph: {
				...state.graph,
				connectors: v2ConnectorReducer(state.graph.connectors, action),
			},
		};
	}
	if (isV2FlowAction(action)) {
		return {
			...state,
			flow: v2FlowReducer(state.flow, action),
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
