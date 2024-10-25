import { setConnectors } from "../../../connector/actions";
import type { ConnectorId } from "../../../connector/types";
import { giselleNodeArchetypes } from "../../../giselle-node/blueprints";
import { giselleNodeCategories } from "../../../giselle-node/types";
import type { CompositeAction } from "../../context";
import { type Source, removeSource } from "./remove-source";

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
			throw new Error(`Connector not found: ${input.connectorId}`);
		}
		switch (removeConnector.targetNodeCategory) {
			case giselleNodeCategories.action: {
				switch (removeConnector.sourceNodeCategory) {
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
									connector.target === removeConnector.target &&
									connector.sourceNodeCategory ===
										giselleNodeCategories.instruction,
							);
						if (relevantInstructionConnector === undefined) {
							throw new Error(
								`Instruction connector not found: ${removeConnector.target}`,
							);
						}
						let source: Source | undefined;
						if (
							removeConnector.sourceNodeArcheType ===
							giselleNodeArchetypes.textGenerator
						) {
							const removeArtifact = getState().graph.artifacts.find(
								(artifact) =>
									artifact.generatorNode.id === removeConnector.source,
							);
							if (removeArtifact !== undefined) {
								source = {
									object: "artifact.reference",
									id: removeArtifact.id,
								};
							}
						} else if (
							removeConnector.sourceNodeArcheType ===
							giselleNodeArchetypes.webSearch
						) {
							const webSearch = getState().graph.webSearches.find(
								(webSearch) =>
									webSearch.generatorNode.id === removeConnector.source,
							);
							if (webSearch !== undefined) {
								source = webSearch;
							}
						}
						if (source === undefined) {
							throw new Error(`Source not found: ${removeConnector.source}`);
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
										(connector) => connector.id !== removeConnector.id,
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
		if (removeConnector.targetNodeCategory === giselleNodeCategories.action) {
			if (removeConnector.sourceNodeCategory === giselleNodeCategories.action) {
			}
		}
	};
}
