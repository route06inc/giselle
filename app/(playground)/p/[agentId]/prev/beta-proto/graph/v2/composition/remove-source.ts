import type { ArtifactReference } from "../../../artifact/types";
import type { GiselleNodeId } from "../../../giselle-node/types";
import type { TextContentReference } from "../../../text-content/types";
import type { WebSearch } from "../../../web-search/types";
import type { CompositeAction } from "../../context";
import { removeConnector } from "./remove-connector";
import { updateNode } from "./update-node";

export type Source = ArtifactReference | TextContentReference | WebSearch;
type RemoveSourceInput = {
	source: Source;
	/**
	 * Instruction Node
	 */
	nodeId: GiselleNodeId;
};

export function removeSource({
	input,
}: { input: RemoveSourceInput }): CompositeAction {
	return (dispatch, getState) => {
		const instructionNode = getState().graph.nodes.find(
			(node) => node.id === input.nodeId,
		);
		if (instructionNode === undefined) {
			throw new Error(`Node not found: ${input.nodeId}`);
		}

		// Remove the source from the sourceNode property
		const currentSources = instructionNode.properties.sources ?? [];
		if (!Array.isArray(currentSources)) {
			throw new Error(
				`${instructionNode.id}'s sources property is not an array`,
			);
		}
		dispatch(
			updateNode({
				input: {
					nodeId: input.nodeId,
					properties: {
						...instructionNode.properties,
						sources: currentSources.filter(
							(currentSource) =>
								typeof currentSource === "object" &&
								currentSource !== null &&
								typeof currentSource.id === "string" &&
								currentSource.id !== input.source.id,
						),
					},
				},
			}),
		);

		// Remove the source from the targetNode parameter
		let sourceCreatorNodeId: GiselleNodeId | undefined;
		if (input.source.object === "artifact.reference") {
			sourceCreatorNodeId = getState().graph.artifacts.find(
				(artifact) => artifact.id === input.source.id,
			)?.generatorNode?.id;
		} else if (input.source.object === "webSearch") {
			sourceCreatorNodeId = getState().graph.webSearches.find(
				(webSearch) => webSearch.id === input.source.id,
			)?.generatorNode?.id;
		}
		if (sourceCreatorNodeId === undefined) {
			return;
		}
		const instructionToActionConnectors = getState().graph.connectors.filter(
			(connector) => connector.source === input.nodeId,
		);
		for (const instructionToActionConnector of instructionToActionConnectors) {
			const sourceConnector = getState().graph.connectors.find(
				(connector) =>
					connector.source === sourceCreatorNodeId &&
					connector.target === instructionToActionConnector.target,
			);
			if (sourceConnector === undefined) {
				continue;
			}
			const relevantNode = getState().graph.nodes.find(
				(node) => node.id === instructionToActionConnector.target,
			);
			if (relevantNode === undefined) {
				throw new Error(
					`Node not found: ${instructionToActionConnector.target}`,
				);
			}
			if (relevantNode.parameters?.object !== "objectParameter") {
				throw new Error(
					`Node's parameters are not an object: ${instructionToActionConnector.target}`,
				);
			}
			const { [sourceConnector.targetHandle]: _, ...properties } =
				relevantNode.parameters.properties;
			dispatch(
				removeConnector({
					input: {
						connectorId: sourceConnector.id,
					},
				}),
			);
			dispatch(
				updateNode({
					input: {
						nodeId: instructionToActionConnector.target,
						parameters: {
							...relevantNode.parameters,
							properties,
						},
					},
				}),
			);
		}
	};
}
