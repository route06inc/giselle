import { readStreamableValue } from "ai/rsc";
import { createArtifactId } from "../artifact/factory";
import { generateArtifactStream } from "../artifact/server-actions";
import type { Artifact, ArtifactId } from "../artifact/types";
import type { PartialGeneratedObject } from "../artifact/types";
import { resolveModelConfiguration } from "../artifact/utils";
import type { V2ConnectorAction } from "../connector/actions";
import { createConnectorId } from "../connector/factory";
import type { ConnectorId, ConnectorObject } from "../connector/types";
import { buildConnector } from "../connector/utils";
import { type StructuredData, fileStatuses } from "../files/types";
import type { V2FlowAction, V2FlowIndexAction } from "../flow/action";
import type { V2NodeAction } from "../giselle-node/actions";
import {
	type GiselleNodeArchetype,
	giselleNodeArchetypes,
	textGeneratorParameterNames,
} from "../giselle-node/blueprints";
import { createGiselleNodeId } from "../giselle-node/factory";
import {
	createObjectParameter,
	createStringParameter,
} from "../giselle-node/parameter/factory";
import type {
	ObjectParameter,
	StringParameter,
} from "../giselle-node/parameter/types";
import {
	type GiselleNode,
	type GiselleNodeBlueprint,
	type GiselleNodeCategory,
	type GiselleNodeId,
	type GiselleNodeState,
	type PanelTab,
	type XYPosition,
	giselleNodeCategories,
	giselleNodeState,
	panelTabs,
} from "../giselle-node/types";
import {
	buildGiselleNode,
	giselleNodeToGiselleNodeArtifactElement,
} from "../giselle-node/utils";
import type { SourceIndex } from "../source/types";
import { extractSourceIndexesFromNode } from "../source/utils";
import type { TextContent, TextContentId } from "../text-content/types";
import { generateWebSearchStream } from "../web-search/server-action";
import {
	type WebSearch,
	type WebSearchItem,
	type WebSearchItemReference,
	webSearchItemStatus,
	webSearchStatus,
} from "../web-search/types";
import type { CompositeAction } from "./context";
import { addConnector as v2AddConnector } from "./v2/composition/add-connector";
import { addNode as v2AddNode } from "./v2/composition/add-node";
import { updateNode as v2UpdateNode } from "./v2/composition/update-node";
import type { V2ModeAction } from "./v2/mode";
import type { V2XyFlowAction } from "./v2/xy-flow";

export type AddNodeAction = {
	type: "addNode";
	payload: {
		node: GiselleNode;
	};
};

type AddNodeArgs = {
	node: GiselleNodeBlueprint;
	position: XYPosition;
	name: string;
	isFinal?: boolean;
	properties?: Record<string, unknown>;
};

/** deprecated */
export const addNode = (args: AddNodeArgs): AddNodeAction => {
	let parameters: ObjectParameter | StringParameter | undefined;
	if (args.node.parameters?.type === "object") {
		parameters = createObjectParameter(args.node.parameters);
	} else if (args.node.parameters?.type === "string") {
		parameters = createStringParameter(args.node.parameters);
	}
	return {
		type: "addNode",
		payload: {
			node: {
				object: "node",
				name: args.name,
				category: args.node.category,
				id: createGiselleNodeId(),
				archetype: args.node.archetype,
				resultPortLabel: args.node.resultPortLabel,
				parameters,
				ui: { position: args.position },
				properties: args.properties ?? {},
				state: giselleNodeState.idle,
				isFinal: args.isFinal ?? false,
				output: "",
			},
		},
	};
};

export type AddConnectorAction = {
	type: "addConnector";
	payload: {
		connector: ConnectorObject;
	};
};

type AddConnectorArgs = {
	sourceNode: {
		id: GiselleNodeId;
		category: GiselleNodeCategory;
		archetype: GiselleNodeArchetype;
	};
	targetNode: {
		id: GiselleNodeId;
		handle: string;
		category: GiselleNodeCategory;
		archetype: GiselleNodeArchetype;
	};
};
/** @deprecated */
export const addConnector = (args: AddConnectorArgs): AddConnectorAction => {
	return {
		type: "addConnector",
		payload: {
			connector: {
				id: createConnectorId(),
				object: "connector",
				source: args.sourceNode.id,
				sourceNodeCategory: args.sourceNode.category,
				sourceNodeArcheType: args.sourceNode.archetype,
				target: args.targetNode.id,
				targetHandle: args.targetNode.handle,
				targetNodeCategory: args.targetNode.category,
				targetNodeArcheType: args.targetNode.archetype,
			},
		},
	};
};

type AddNodesAndConnectArgs = {
	sourceNode: Omit<AddNodeArgs, "name">;
	targetNode: Omit<AddNodeArgs, "name">;
	connector: {
		targetParameterName: string;
	};
};
export const addNodesAndConnect = (
	args: AddNodesAndConnectArgs,
): CompositeAction => {
	return (dispatch, getState) => {
		const state = getState();
		const currentNodes = getState().graph.nodes;
		const addSourceNode = buildGiselleNode({
			...args.sourceNode,
			name: `Untitled node - ${currentNodes.length + 1}`,
		});
		dispatch(v2AddNode({ input: { node: addSourceNode } }));
		const addTargetNode = buildGiselleNode({
			...args.targetNode,
			isFinal: true,
			name: `Untitled node - ${currentNodes.length + 2}`,
		});
		dispatch(v2AddNode({ input: { node: addTargetNode } }));
		dispatch(
			v2AddConnector({
				input: {
					connector: buildConnector({
						sourceNode: {
							id: addSourceNode.id,
							category: args.sourceNode.node.category,
							archetype: args.sourceNode.node.archetype,
						},
						targetNode: {
							id: addTargetNode.id,
							handle: args.connector.targetParameterName,
							category: args.targetNode.node.category,
							archetype: args.targetNode.node.archetype,
						},
					}),
				},
			}),
		);
		if (addSourceNode.archetype === giselleNodeArchetypes.prompt) {
			const selectedNodes = getState().graph.nodes.filter(
				(node) => node.ui.selected,
			);
			selectedNodes.map((node) => {
				dispatch(
					v2UpdateNode({
						input: {
							nodeId: node.id,
							ui: {
								selected: false,
							},
						},
					}),
				);
			});
			dispatch(
				v2UpdateNode({
					input: {
						nodeId: addSourceNode.id,
						ui: {
							selected: true,
							panelTab: panelTabs.property,
						},
					},
				}),
			);
		}
	};
};

type SetPanelTabAction = {
	type: "setPanelTab";
	payload: {
		node: {
			id: GiselleNodeId;
			panelTab: PanelTab;
		};
	};
};
type SetPanelTabArgs = {
	node: {
		id: GiselleNodeId;
		panelTab: PanelTab;
	};
};
export const setPanelTab = (args: SetPanelTabArgs): SetPanelTabAction => {
	return {
		type: "setPanelTab",
		payload: {
			node: args.node,
		},
	};
};

type UpdateNodePropertyAction = {
	type: "updateNodeProperties";
	payload: {
		node: {
			id: GiselleNodeId;
			property: {
				key: string;
				value: unknown;
			};
		};
	};
};

type UpdateNodePropertyArgs = {
	node: {
		id: GiselleNodeId;
		property: {
			key: string;
			value: unknown;
		};
	};
};

export const updateNodeProperty = (
	args: UpdateNodePropertyArgs,
): UpdateNodePropertyAction => {
	return {
		type: "updateNodeProperties",
		payload: {
			node: args.node,
		},
	};
};

type UpdateNodesUIAction = {
	type: "updateNodesUI";
	payload: {
		nodes: Array<{
			id: GiselleNodeId;
			ui: Partial<GiselleNode["ui"]>;
		}>;
	};
};

type UpdateNodesUIArgs = {
	nodes: Array<{
		id: GiselleNodeId;
		ui: Partial<GiselleNode["ui"]>;
	}>;
};

export const updateNodesUI = (args: UpdateNodesUIArgs): UpdateNodesUIAction => {
	return {
		type: "updateNodesUI",
		payload: {
			nodes: args.nodes,
		},
	};
};

type SetNodeOutputAction = {
	type: "setNodeOutput";
	payload: {
		node: {
			id: GiselleNodeId;
			// biome-ignore lint: lint/suspicious/noExplicitAny
			output: any;
		};
	};
};

type SetNodeOutputArgs = {
	node: {
		id: GiselleNodeId;
		// biome-ignore lint: lint/suspicious/noExplicitAny
		output: any;
	};
};
export const setNodeOutput = (args: SetNodeOutputArgs): SetNodeOutputAction => {
	return {
		type: "setNodeOutput",
		payload: {
			node: args.node,
		},
	};
};

type SetTextGenerationNodeOutputAction = {
	type: "setTextGenerationNodeOutput";
	payload: {
		node: {
			id: GiselleNodeId;
			output: PartialGeneratedObject;
		};
	};
};

type SetTextGenerationNodeOutputArgs = {
	node: {
		id: GiselleNodeId;
		output: PartialGeneratedObject;
	};
};
const setTextGenerationNodeOutput = (
	args: SetTextGenerationNodeOutputArgs,
): SetTextGenerationNodeOutputAction => {
	return {
		type: "setTextGenerationNodeOutput",
		payload: args,
	};
};

type UpdateNodeStateAction = {
	type: "updateNodeState";
	payload: {
		node: {
			id: GiselleNodeId;
			state: GiselleNodeState;
		};
	};
};
type UpdateNodeStateArgs = {
	node: {
		id: GiselleNodeId;
		state: GiselleNodeState;
	};
};
export const updateNodeState = (
	args: UpdateNodeStateArgs,
): UpdateNodeStateAction => {
	return {
		type: "updateNodeState",
		payload: {
			node: args.node,
		},
	};
};

type AddOrReplaceArtifactAction = {
	type: "addOrReplaceArtifact";
	payload: AddOrReplaceArtifactArgs;
};

type AddOrReplaceArtifactArgs = {
	artifact: Artifact;
};

export const addOrReplaceArtifact = (
	args: AddOrReplaceArtifactArgs,
): AddOrReplaceArtifactAction => {
	return {
		type: "addOrReplaceArtifact",
		payload: args,
	};
};

type GenerateTextArgs = {
	textGeneratorNode: {
		id: GiselleNodeId;
	};
};

type RemoveArtifactAction = {
	type: "removeArtifact";
	payload: RemoveArtifactArgs;
};

type RemoveArtifactArgs = {
	artifact: {
		id: ArtifactId;
	};
};

export const removeArtifact = (
	args: RemoveArtifactArgs,
): RemoveArtifactAction => {
	return {
		type: "removeArtifact",
		payload: args,
	};
};

export const generateText =
	(args: GenerateTextArgs): CompositeAction =>
	async (dispatch, getState) => {
		dispatch(
			setNodeOutput({
				node: {
					id: args.textGeneratorNode.id,
					output: "",
				},
			}),
		);
		dispatch(
			updateNodeState({
				node: {
					id: args.textGeneratorNode.id,
					state: giselleNodeState.inProgress,
				},
			}),
		);
		const state = getState();
		const instructionConnector = state.graph.connectors.find(
			(connector) =>
				connector.target === args.textGeneratorNode.id &&
				connector.targetHandle === textGeneratorParameterNames.instruction &&
				connector.sourceNodeCategory === giselleNodeCategories.instruction,
		);
		if (instructionConnector === undefined) {
			/** @todo error handling  */
			throw new Error("Instruction connector not found");
		}
		const instructionNode = state.graph.nodes.find(
			(node) => node.id === instructionConnector?.source,
		);
		if (
			instructionNode === undefined ||
			instructionNode.archetype !== giselleNodeArchetypes.prompt
		) {
			/** @todo error handling  */
			throw new Error("Instruction node not found");
		}

		const node = state.graph.nodes.find(
			(node) => node.id === args.textGeneratorNode.id,
		);
		if (node === undefined) {
			/** @todo error handling  */
			throw new Error("Node not found");
		}

		const sourceIndexes = extractSourceIndexesFromNode(instructionNode);
		switch (instructionConnector.targetNodeArcheType) {
			case giselleNodeArchetypes.textGenerator: {
				const { object } = await generateArtifactStream({
					agentId: getState().graph.agentId,
					userPrompt: instructionNode.output as string,
					sourceIndexes,
					modelConfiguration: resolveModelConfiguration(node),
				});

				let content: PartialGeneratedObject = {};
				for await (const streamContent of readStreamableValue(object)) {
					if (
						typeof streamContent === "object" &&
						Object.keys(streamContent).length > 0
					) {
						dispatch(
							updateNodeState({
								node: {
									id: args.textGeneratorNode.id,
									state: giselleNodeState.streaming,
								},
							}),
						);
						dispatch(
							setTextGenerationNodeOutput({
								node: {
									id: args.textGeneratorNode.id,
									output:
										streamContent as PartialGeneratedObject /** @todo type assertion */,
								},
							}),
						);
					} else if (typeof streamContent === "string") {
						dispatch(
							setTextGenerationNodeOutput({
								node: {
									id: args.textGeneratorNode.id,
									output: {
										thinking:
											"Sorry, a temporary issue has occurred.\nPlease try again after a while.",
									},
								},
							}),
						);
					}
					content = streamContent as PartialGeneratedObject;
				}
				if (typeof content === "string") {
					dispatch(
						updateNodeState({
							node: {
								id: args.textGeneratorNode.id,
								state: giselleNodeState.completed,
							},
						}),
					);
					break;
				}
				dispatch(
					setTextGenerationNodeOutput({
						node: {
							id: args.textGeneratorNode.id,
							output: {
								...content,
								artifact: {
									title: content?.artifact?.title ?? "",
									content: content?.artifact?.content ?? "",
									citations: content?.artifact?.citations ?? [],
									completed: true,
								},
							},
						},
					}),
				);

				const artifact = state.graph.artifacts.find(
					(artifact) => artifact.generatorNode.id === args.textGeneratorNode.id,
				);

				dispatch(
					addOrReplaceArtifact({
						artifact: {
							id: artifact === undefined ? createArtifactId() : artifact.id,
							object: "artifact",
							title: content?.artifact?.title ?? "",
							content: content?.artifact?.content ?? "",
							generatorNode: {
								id: node.id,
								archetype: node.archetype,
								name: node.name,
								object: "node.artifactElement",
							},
						},
					}),
				);
				dispatch(
					updateNodeState({
						node: {
							id: args.textGeneratorNode.id,
							state: giselleNodeState.completed,
						},
					}),
				);
				break;
			}
			case giselleNodeArchetypes.webSearch: {
				const { object } = await generateWebSearchStream({
					agentId: getState().graph.agentId,
					userPrompt: instructionNode.output as string,
					sourceIndexes,
					node,
				});
				let content: PartialGeneratedObject = {};
				for await (const streamContent of readStreamableValue(object)) {
					if (
						typeof streamContent === "object" &&
						Object.keys(streamContent).length > 0
					) {
						dispatch(
							updateNodeState({
								node: {
									id: args.textGeneratorNode.id,
									state: giselleNodeState.streaming,
								},
							}),
						);
					}
					dispatch(
						setTextGenerationNodeOutput({
							node: {
								id: args.textGeneratorNode.id,
								output:
									streamContent as PartialGeneratedObject /** @todo type assertion */,
							},
						}),
					);
					content = streamContent as PartialGeneratedObject;
				}
				dispatch(
					setTextGenerationNodeOutput({
						node: {
							id: args.textGeneratorNode.id,
							output: {
								...content,
								artifact: {
									title: content?.artifact?.title ?? "",
									content: content?.artifact?.content ?? "",
									citations: content?.artifact?.citations ?? [],
									completed: true,
								},
							},
						},
					}),
				);

				dispatch(
					updateNodeState({
						node: {
							id: args.textGeneratorNode.id,
							state: giselleNodeState.completed,
						},
					}),
				);
				dispatch(
					upsertWebSearch({
						// biome-ignore lint: lint/suspicious/noExplicitAny be typesafe earlier
						webSearch: (content as any).webSearch,
					}),
				);
				break;
			}
		}
	};

type RemoveNodeAction = {
	type: "removeNode";
	payload: RemoveNodeArgs;
};

type RemoveNodeArgs = {
	node: {
		id: GiselleNodeId;
	};
};

export function removeNode(args: RemoveNodeArgs): RemoveNodeAction {
	return {
		type: "removeNode",
		payload: args,
	};
}

interface UpsertWebSearchAction {
	type: "upsertWebSearch";
	inputs: UpsertWebSearchInputs;
}
interface UpsertWebSearchInputs {
	webSearch: WebSearch;
}
function upsertWebSearch(inputs: UpsertWebSearchInputs): UpsertWebSearchAction {
	return {
		type: "upsertWebSearch",
		inputs,
	};
}

export type GraphAction =
	| AddNodeAction
	| RemoveNodeAction
	| AddConnectorAction
	| SetPanelTabAction
	| UpdateNodePropertyAction
	| UpdateNodesUIAction
	| SetNodeOutputAction
	| SetTextGenerationNodeOutputAction
	| UpdateNodeStateAction
	| AddOrReplaceArtifactAction
	| RemoveArtifactAction
	| UpsertWebSearchAction
	| V2NodeAction
	| V2ModeAction
	| V2FlowIndexAction
	| V2XyFlowAction
	| V2ConnectorAction
	| V2FlowAction;
