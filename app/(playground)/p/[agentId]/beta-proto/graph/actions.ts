import { readStreamableValue } from "ai/rsc";
import { createArtifactId } from "../artifact/factory";
import type {
	Artifact,
	ArtifactId,
	ArtifactReference,
} from "../artifact/types";
import type { PartialGeneratedObject } from "../artifact/types";
import { createConnectorId } from "../connector/factory";
import type { ConnectorId, ConnectorObject } from "../connector/types";
import {
	type GiselleFile,
	type StructuredData,
	fileStatuses,
} from "../files/types";
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
	Parameter,
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
import { giselleNodeToGiselleNodeArtifactElement } from "../giselle-node/utils";
import type { TextContent, TextContentReference } from "../text-content/types";
import type { ThunkAction } from "./context";
import {
	generateArtifactStream,
	generateWebSearchStream,
	parseFile,
	uploadFile,
} from "./server-actions";

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
	properties?: Record<string, unknown>;
};

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

export type RemoveConnectorAction = {
	type: "removeConnector";
	payload: RemoveConnectorArgs;
};

type RemoveConnectorArgs = {
	connector: {
		id: ConnectorId;
	};
};

export const removeConnector = (
	args: RemoveConnectorArgs,
): RemoveConnectorAction => {
	return {
		type: "removeConnector",
		payload: args,
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
): ThunkAction => {
	return (dispatch, getState) => {
		const currentNodes = getState().graph.nodes;
		const addSourceNode = addNode({
			...args.sourceNode,
			name: `Untitled node - ${currentNodes.length + 1}`,
		});
		dispatch(addSourceNode);
		const addTargetNode = addNode({
			...args.targetNode,
			name: `Untitled node - ${currentNodes.length + 2}`,
		});
		dispatch(addTargetNode);
		dispatch(
			addConnector({
				sourceNode: {
					id: addSourceNode.payload.node.id,
					category: args.sourceNode.node.category,
					archetype: args.sourceNode.node.archetype,
				},
				targetNode: {
					id: addTargetNode.payload.node.id,
					handle: args.connector.targetParameterName,
					category: args.targetNode.node.category,
					archetype: args.targetNode.node.archetype,
				},
			}),
		);
		if (addSourceNode.payload.node.archetype === giselleNodeArchetypes.prompt) {
			dispatch(
				updateNodesUI({
					nodes: [
						{
							id: addSourceNode.payload.node.id,
							ui: {
								selected: true,
								panelTab: panelTabs.property,
							},
						},
					],
				}),
			);
		}
	};
};

type SelectNodeAction = {
	type: "selectNode";
	payload: {
		selectedNodeIds: GiselleNodeId[];
	};
};

type SelectNodeArgs = {
	selectedNodeIds: GiselleNodeId[];
};
export const selectNode = (args: SelectNodeArgs): SelectNodeAction => {
	return {
		type: "selectNode",
		payload: {
			selectedNodeIds: args.selectedNodeIds,
		},
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

export const selectNodeAndSetPanelTab = (args: {
	selectNode: {
		id: GiselleNodeId;
		panelTab: PanelTab;
	};
}): ThunkAction => {
	return (dispatch) => {
		dispatch(
			selectNode({
				selectedNodeIds: [args.selectNode.id],
			}),
		);
		dispatch(
			setPanelTab({
				node: {
					id: args.selectNode.id,
					panelTab: args.selectNode.panelTab,
				},
			}),
		);
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
	(args: GenerateTextArgs): ThunkAction =>
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

		type Source = Artifact | TextContent | StructuredData;
		const instructionSources: Source[] = [];
		if (Array.isArray(instructionNode.properties.sources)) {
			for (const source of instructionNode.properties.sources) {
				if (
					typeof source !== "object" ||
					source === null ||
					typeof source.id !== "string" ||
					typeof source.object !== "string"
				) {
					continue;
				}
				if (source.object === "textContent") {
					instructionSources.push(source);
				} else if (source.object === "artifact.reference") {
					const artifact = state.graph.artifacts.find(
						(artifact) => artifact.id === source.id,
					);
					if (artifact !== undefined) {
						instructionSources.push(artifact);
					}
				} else if (source.object === "file") {
					if (
						typeof source.status === "string" &&
						source.status === fileStatuses.processed &&
						typeof source.structuredDataBlobUrl === "string" &&
						typeof source.name === "string"
					) {
						const structuredData = await fetch(
							source.structuredDataBlobUrl,
						).then((res) => res.text());
						instructionSources.push({
							id: source.id,
							object: "file",
							title: source.name,
							content: structuredData,
						});
					}
				}
			}
		}

		console.log(instructionConnector.targetNodeArcheType);
		switch (instructionConnector.targetNodeArcheType) {
			case giselleNodeArchetypes.textGenerator: {
				const systemPrompt =
					instructionSources.length > 0
						? `
Your primary objective is to fulfill the user's request by utilizing the information provided within the <Source> tags. Analyze the structured content carefully and leverage it to generate accurate and relevant responses. Focus on addressing the user's needs effectively while maintaining coherence and context throughout the interaction.

${instructionSources.map((source) => `<Source title="${source.title}" type="${source.object}" id="${source.id}">${source.content}</Source>`).join("\n")}
`
						: undefined;
				console.log({
					systemPrompt,
					instructionNodeOutput: instructionNode.output,
				});

				const { object } = await generateArtifactStream({
					userPrompt: instructionNode.output as string,
					systemPrompt,
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
									completed: true,
								},
							},
						},
					}),
				);

				const artifact = state.graph.artifacts.find(
					(artifact) => artifact.generatorNode.id === args.textGeneratorNode.id,
				);
				const node = state.graph.nodes.find(
					(node) => node.id === args.textGeneratorNode.id,
				);
				if (node === undefined) {
					/** @todo error handling  */
					throw new Error("Node not found");
				}

				dispatch(
					addOrReplaceArtifact({
						artifact: {
							id: artifact === undefined ? createArtifactId() : artifact.id,
							object: "artifact",
							title: content?.artifact?.title ?? "",
							content: content?.artifact?.content ?? "",
							generatorNode: {
								id: node.id,
								category: node.category,
								archetype: node.archetype,
								name: node.name,
								object: "node.artifactElement",
								properties: node.properties,
							},
							elements: [
								giselleNodeToGiselleNodeArtifactElement(instructionNode),
							],
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
				const systemPrompt = `
You are an AI assistant specialized in generating effective keywords for Google Search based on user requests. Your task is to analyze the user's input and produce a concise, relevant keyword or short phrase that will yield the most useful search results.

Follow these guidelines:
1. Identify the core topic or intent of the user's request.
2. Extract the most important words or concepts.
3. Consider synonyms or related terms that might be more commonly used.
4. Aim for specificity while avoiding overly niche terms.
5. Keep the keyword or phrase concise, typically 1-3 words.
6. Avoid branded terms unless specifically mentioned by the user.
7. Use common spelling and avoid abbreviations unless they are widely recognized.
8. You must suggest keywords at least 3 times.
9. If provided, incorporate relevant reference information to refine the keyword.

Examples:
User request: "I need information about the health benefits of eating apples."
Keyword: "apple health benefits"

User request: "What are some good restaurants in New York City for Italian cuisine?"
Keyword: "best NYC Italian restaurants"

User request: "How do I fix a leaky faucet in my bathroom sink?"
Keyword: "fix leaky faucet"

User request: "Tell me about the impact of climate change on polar bears."
Reference info: Recent studies show declining sea ice affects hunting patterns.
Keyword: "polar bear sea ice impact"

Now, generate an appropriate keyword or short phrase for Google Search based on the user's request and any provided reference information.

--
${instructionSources.map((source) => `<Source title="${source.title}" type="${source.object}" id="${source.id}">${source.content}</Source>`).join("\n")}
--
			`;

				const { object } = await generateWebSearchStream({
					userPrompt: instructionNode.output as string,
					systemPrompt,
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
									completed: true,
								},
							},
						},
					}),
				);

				const artifact = state.graph.artifacts.find(
					(artifact) => artifact.generatorNode.id === args.textGeneratorNode.id,
				);
				const node = state.graph.nodes.find(
					(node) => node.id === args.textGeneratorNode.id,
				);
				if (node === undefined) {
					/** @todo error handling  */
					throw new Error("Node not found");
				}

				dispatch(
					addOrReplaceArtifact({
						artifact: {
							id: artifact === undefined ? createArtifactId() : artifact.id,
							object: "artifact",
							title: content?.artifact?.title ?? "",
							content: content?.artifact?.content ?? "",
							generatorNode: {
								id: node.id,
								category: node.category,
								archetype: node.archetype,
								name: node.name,
								object: "node.artifactElement",
								properties: node.properties,
							},
							elements: [
								giselleNodeToGiselleNodeArtifactElement(instructionNode),
							],
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
		}
	};

type AddParameterToNodeAction = {
	type: "addParameterToNode";
	payload: AddParameterToNodeArgs;
};
type AddParameterToNodeArgs = {
	node: {
		id: GiselleNodeId;
	};
	parameter: {
		key: string;
		value: Parameter;
	};
};
export function addParameterToNode(
	args: AddParameterToNodeArgs,
): AddParameterToNodeAction {
	return {
		type: "addParameterToNode",
		payload: args,
	};
}

type RemoveParameterFromNodeAction = {
	type: "removeParameterFromNode";
	payload: RemoveParameterFromNodeArgs;
};
type RemoveParameterFromNodeArgs = {
	node: {
		id: GiselleNodeId;
	};
	parameter: {
		key: string;
	};
};
export function removeParameterFromNode(
	args: RemoveParameterFromNodeArgs,
): RemoveParameterFromNodeAction {
	return {
		type: "removeParameterFromNode",
		payload: args,
	};
}

type Source = ArtifactReference | TextContent | GiselleFile;
type AddSourceToPromptNodeArgs = {
	promptNode: {
		id: GiselleNodeId;
	};
	source: Source;
};
export function addSourceToPromptNode(
	args: AddSourceToPromptNodeArgs,
): ThunkAction {
	return async (dispatch, getState) => {
		const state = getState();
		const updateNode = state.graph.nodes.find(
			(node) => node.id === args.promptNode.id,
		);
		if (updateNode === undefined) {
			return;
		}
		if (updateNode.archetype !== giselleNodeArchetypes.prompt) {
			return;
		}
		const currentSources = updateNode.properties.sources ?? [];
		if (!Array.isArray(currentSources)) {
			throw new Error(`${updateNode.id}'s sources property is not an array`);
		}
		dispatch(
			updateNodeProperty({
				node: {
					id: args.promptNode.id,
					property: {
						key: "sources",
						value: [...currentSources, args.source],
					},
				},
			}),
		);
		if (args.source.object === "artifact.reference") {
			const artifact = state.graph.artifacts.find(
				(artifact) => artifact.id === args.source.id,
			);
			if (artifact === undefined) {
				return;
			}
			const outgoingConnectors = state.graph.connectors.filter(
				({ source }) => source === args.promptNode.id,
			);
			for (const outgoingConnector of outgoingConnectors) {
				const outgoingNode = state.graph.nodes.find(
					(node) => node.id === outgoingConnector.target,
				);
				if (outgoingNode === undefined) {
					continue;
				}
				const currentSourceHandleLength =
					outgoingNode.parameters?.object === "objectParameter"
						? Object.keys(outgoingNode.parameters.properties).filter((key) =>
								key.startsWith("source"),
							).length
						: 0;
				dispatch(
					addParameterToNode({
						node: {
							id: outgoingConnector.target,
						},
						parameter: {
							key: `source${currentSourceHandleLength + 1}`,
							value: createStringParameter({
								label: `Source${currentSourceHandleLength + 1}`,
							}),
						},
					}),
				);
				dispatch(
					addConnector({
						sourceNode: {
							id: artifact.generatorNode.id,
							category: artifact.generatorNode.category,
							archetype: artifact.generatorNode.archetype,
						},
						targetNode: {
							id: outgoingConnector.target,
							handle: `source${currentSourceHandleLength + 1}`,
							category: outgoingConnector.targetNodeCategory,
							archetype: outgoingNode.archetype,
						},
					}),
				);
			}
		} else if (args.source.object === "file") {
			if (args.source.status === fileStatuses.uploading) {
				const fileVercelBlob = await uploadFile({
					file: args.source.file,
					fileId: args.source.id,
				});
				dispatch(
					updateNodeProperty({
						node: {
							id: args.promptNode.id,
							property: {
								key: "sources",
								value: [
									...currentSources,
									{
										...args.source,
										blobUrl: fileVercelBlob.url,
										status: fileStatuses.processing,
									},
								],
							},
						},
					}),
				);
				const structuredDataVercelBlob = await parseFile({
					id: args.source.id,
					name: args.source.name,
					blobUrl: fileVercelBlob.url,
				});
				dispatch(
					updateNodeProperty({
						node: {
							id: args.promptNode.id,
							property: {
								key: "sources",
								value: [
									...currentSources,
									{
										...args.source,
										blobUrl: fileVercelBlob.url,
										structuredDataBlobUrl: structuredDataVercelBlob.url,
										status: fileStatuses.processed,
									},
								],
							},
						},
					}),
				);
			}
		}
	};
}

type Source2 = ArtifactReference | TextContentReference;
type RemoveSourceFromPromptNodeArgs = {
	promptNode: {
		id: GiselleNodeId;
	};
	source: Source2;
};
export function removeSourceFromPromptNode(
	args: RemoveSourceFromPromptNodeArgs,
): ThunkAction {
	return (dispatch, getState) => {
		const state = getState();
		const targetNode = state.graph.nodes.find(
			(node) => node.id === args.promptNode.id,
		);
		if (targetNode === undefined) {
			return;
		}
		if (targetNode.archetype !== giselleNodeArchetypes.prompt) {
			return;
		}
		const currentSources = targetNode.properties.sources ?? [];
		if (!Array.isArray(currentSources)) {
			throw new Error(`${targetNode.id}'s sources property is not an array`);
		}

		dispatch(
			updateNodeProperty({
				node: {
					id: args.promptNode.id,
					property: {
						key: "sources",
						value: currentSources.filter(
							(currentSource) =>
								typeof currentSource === "object" &&
								currentSource !== null &&
								typeof currentSource.id === "string" &&
								currentSource.id !== args.source.id,
						),
					},
				},
			}),
		);
		if (args.source.object === "artifact.reference") {
			const artifact = state.graph.artifacts.find(
				(artifact) => artifact.id === args.source.id,
			);
			if (artifact === undefined) {
				return;
			}
			const outgoingConnectors = state.graph.connectors.filter(
				({ source }) => source === args.promptNode.id,
			);
			for (const outgoingConnector of outgoingConnectors) {
				const outgoingNode = state.graph.nodes.find(
					(node) => node.id === outgoingConnector.target,
				);
				if (outgoingNode === undefined) {
					continue;
				}
				const artifactCreatorNodeToOutgoingNodeConnector =
					state.graph.connectors.find(
						(connector) =>
							connector.target === outgoingNode.id &&
							connector.source === artifact.generatorNode.id,
					);
				if (artifactCreatorNodeToOutgoingNodeConnector === undefined) {
					continue;
				}
				dispatch(
					removeConnector({
						connector: {
							id: artifactCreatorNodeToOutgoingNodeConnector.id,
						},
					}),
				);
				dispatch(
					removeParameterFromNode({
						node: {
							id: outgoingConnector.target,
						},
						parameter: {
							key: artifactCreatorNodeToOutgoingNodeConnector.targetHandle,
						},
					}),
				);
			}
		}
	};
}

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

export function removeSelectedNodesOrFeedback(): ThunkAction {
	return (dispatch, getState) => {
		const state = getState();
		const selectedNodes = state.graph.nodes.filter((node) => node.ui.selected);
		if (selectedNodes.length < 1) {
			return;
		}
		const onlyDeletableNodesSelected = selectedNodes.every((selectedNode) => {
			switch (selectedNode.archetype) {
				case giselleNodeArchetypes.prompt:
					return true;
				case giselleNodeArchetypes.textGenerator:
					return true;
				case giselleNodeArchetypes.webSearch:
					return true;
			}
		});
		if (!onlyDeletableNodesSelected) {
			/** @todo set ui state to present feedback dialog */
			return;
		}
		// List of artifacts that are created by the selected nodes
		const relatedArtifacts = state.graph.artifacts.filter((artifact) =>
			selectedNodes.some(
				(selectedNode) => selectedNode.id === artifact.generatorNode.id,
			),
		);
		for (const relatedArtifact of relatedArtifacts) {
			// List of prompt nodes that depend on the artifact
			const promptNodesDependedOnByArtifact = state.graph.nodes.filter(
				(node) =>
					Array.isArray(node.properties.sources) &&
					node.properties.sources.includes(relatedArtifact.id),
			);
			for (const promptNodeDependedOnByArtifact of promptNodesDependedOnByArtifact) {
				if (!Array.isArray(promptNodeDependedOnByArtifact.properties.sources)) {
					continue;
				}
				dispatch(
					removeSourceFromPromptNode({
						promptNode: {
							id: promptNodeDependedOnByArtifact.id,
						},
						source: { id: relatedArtifact.id, object: "artifact.reference" },
					}),
				);
			}
			dispatch(removeArtifact({ artifact: { id: relatedArtifact.id } }));
		}
		const relatedConnectors = state.graph.connectors.filter(
			(connector) =>
				selectedNodes.some(
					(selectedNode) => selectedNode.id === connector.source,
				) ||
				selectedNodes.some(
					(selectedNode) => selectedNode.id === connector.target,
				),
		);
		for (const relatedConnector of relatedConnectors) {
			dispatch(
				removeConnector({
					connector: {
						id: relatedConnector.id,
					},
				}),
			);
		}
		for (const selectedNode of selectedNodes) {
			dispatch(
				removeNode({
					node: {
						id: selectedNode.id,
					},
				}),
			);
		}
	};
}

export type GraphAction =
	| AddNodeAction
	| RemoveNodeAction
	| AddConnectorAction
	| RemoveConnectorAction
	| SelectNodeAction
	| SetPanelTabAction
	| UpdateNodePropertyAction
	| UpdateNodesUIAction
	| SetNodeOutputAction
	| SetTextGenerationNodeOutputAction
	| UpdateNodeStateAction
	| AddOrReplaceArtifactAction
	| RemoveArtifactAction
	| AddParameterToNodeAction
	| RemoveParameterFromNodeAction;
