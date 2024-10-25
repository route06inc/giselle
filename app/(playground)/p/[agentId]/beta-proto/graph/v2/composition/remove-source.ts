import type { ArtifactReference } from "../../../artifact/types";
import { setConnectors } from "../../../connector/actions";
import type { GiselleNode, GiselleNodeId } from "../../../giselle-node/types";
import type { TextContentReference } from "../../../text-content/types";
import type { WebSearch } from "../../../web-search/types";
import { removeParameterFromNode, updateNodeProperty } from "../../actions";
import type { CompositeAction } from "../../context";
import { updateNode } from "./update-node";

export type Source = ArtifactReference | TextContentReference | WebSearch;
type RemoveSourceInput = {
	source: Source;
	nodeId: GiselleNodeId;
};

export function removeSource({
	input,
}: { input: RemoveSourceInput }): CompositeAction {
	return (dispatch, getState) => {
		const node = getState().graph.nodes.find(
			(node) => node.id === input.nodeId,
		);
		if (node === undefined) {
			throw new Error(`Node not found: ${input.nodeId}`);
		}

		// Remove the source from the sourceNode property
		const currentSources = node.properties.sources ?? [];
		if (!Array.isArray(currentSources)) {
			throw new Error(`${node.id}'s sources property is not an array`);
		}
		dispatch(
			updateNode({
				input: {
					nodeId: input.nodeId,
					properties: {
						...node.properties,
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
			throw new Error(`Source creator node not found: ${input.source.id}`);
		}
		const relevantConnectors = getState().graph.connectors.filter(
			(connector) => connector.source === input.nodeId,
		);
		for (const relevantConnector of relevantConnectors) {
			const sourceConnector = getState().graph.connectors.find(
				(connector) =>
					connector.source === sourceCreatorNodeId &&
					connector.target === relevantConnector.target,
			);
			if (sourceConnector === undefined) {
				throw new Error(
					`Source connector not found: ${sourceCreatorNodeId} -> ${relevantConnector.target}`,
				);
			}
			const relevantNode = getState().graph.nodes.find(
				(node) => node.id === relevantConnector.target,
			);
			if (relevantNode === undefined) {
				throw new Error(`Node not found: ${relevantConnector.target}`);
			}
			if (relevantNode.parameters?.object !== "objectParameter") {
				throw new Error(
					`Node's parameters are not an object: ${relevantConnector.target}`,
				);
			}
			const { [relevantConnector.targetHandle]: _, ...properties } =
				relevantNode.parameters.properties;
			dispatch(
				updateNode({
					input: {
						nodeId: relevantConnector.target,
						parameters: {
							...relevantNode.parameters,
							properties,
						},
					},
				}),
			);
			dispatch(
				setConnectors({
					input: {
						connectors: getState().graph.connectors.filter(
							(connector) => connector.id !== sourceConnector.id,
						),
					},
				}),
			);
		}
	};
}
