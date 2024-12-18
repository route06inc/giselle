import { setConnectors } from "../../../connector/actions";
import type { ConnectorId, ConnectorObject } from "../../../connector/types";
import { giselleNodeArchetypes } from "../../../giselle-node/blueprints";
import { giselleNodeCategories } from "../../../giselle-node/types";
import type { CompositeAction } from "../../context";
import { setXyFlowEdges } from "../xy-flow";
import { type Source, removeSource } from "./remove-source";
import { updateNode } from "./update-node";

type RemoveConnectorInput = {
	connectorId: ConnectorId;
};

export function removeConnector({
	input,
}: { input: RemoveConnectorInput }): CompositeAction {
	return (dispatch, getState) => {
		const removeConnector = getState().graph.connectors.find(
			(connector) => connector.id === input.connectorId,
		);
		if (removeConnector === undefined) {
			return;
		}
		dispatch(
			setConnectors({
				input: {
					connectors: getState().graph.connectors.filter(
						(connector) => connector.id !== removeConnector.id,
					),
				},
			}),
		);
		dispatch(
			setXyFlowEdges({
				input: {
					xyFlowEdges: getState().graph.xyFlow.edges.filter(
						(edge) => edge.id !== removeConnector.id,
					),
				},
			}),
		);
		dispatch(
			removeSourcesConnected({
				input: { connector: removeConnector },
			}),
		);
		dispatch(
			updateFinalFlag({
				input: { connector: removeConnector },
			}),
		);
	};
}

interface RemoveSourcesConnectedInput {
	connector: ConnectorObject;
}
function removeSourcesConnected({
	input,
}: { input: RemoveSourcesConnectedInput }): CompositeAction {
	return (dispatch, getState) => {
		switch (input.connector.targetNodeCategory) {
			case giselleNodeCategories.action: {
				switch (input.connector.sourceNodeCategory) {
					case giselleNodeCategories.action: {
						// Execute this process when a connector
						// from an action node like TextGenerator
						// or WebSearch to another action node is removed.
						// There is a Prompt node connected to the target
						// action node that instructed the connection,
						// hence remove it.
						const relevantInstructionConnector =
							getState().graph.connectors.find(
								(connector) =>
									connector.target === input.connector.target &&
									connector.sourceNodeCategory ===
										giselleNodeCategories.instruction,
							);
						if (relevantInstructionConnector === undefined) {
							return;
						}
						let source: Source | undefined;
						if (
							input.connector.sourceNodeArcheType ===
							giselleNodeArchetypes.textGenerator
						) {
							const removeArtifact = getState().graph.artifacts.find(
								(artifact) =>
									artifact.generatorNode.id === input.connector.source,
							);
							if (removeArtifact !== undefined) {
								source = {
									object: "artifact.reference",
									id: removeArtifact.id,
								};
							}
						} else if (
							input.connector.sourceNodeArcheType ===
							giselleNodeArchetypes.webSearch
						) {
							const webSearch = getState().graph.webSearches.find(
								(webSearch) =>
									webSearch.generatorNode.id === input.connector.source,
							);
							if (webSearch !== undefined) {
								source = webSearch;
							}
						}
						if (source === undefined) {
							throw new Error(`Source not found: ${input.connector.source}`);
						}

						dispatch(
							removeSource({
								input: {
									nodeId: relevantInstructionConnector.source,
									source,
								},
							}),
						);
						break;
					}
					case giselleNodeCategories.instruction:
						dispatch(
							setConnectors({
								input: {
									connectors: getState().graph.connectors.filter(
										(connector) => connector.id !== input.connector.id,
									),
								},
							}),
						);
						break;
				}
				break;
			}
			default:
				throw new Error("Unexpected target node category detected");
		}
	};
}

interface UpdateFinalFlagInput {
	connector: ConnectorObject;
}
function updateFinalFlag({
	input,
}: { input: UpdateFinalFlagInput }): CompositeAction {
	return (dispatch, getState) => {
		const targetNode = getState().graph.nodes.find(
			(node) => node.id === input.connector.target,
		);
		if (
			targetNode?.isFinal &&
			input.connector.sourceNodeCategory === giselleNodeCategories.action
		) {
			dispatch(
				updateNode({
					input: {
						nodeId: input.connector.source,
						isFinal: true,
					},
				}),
			);
		}
	};
}
