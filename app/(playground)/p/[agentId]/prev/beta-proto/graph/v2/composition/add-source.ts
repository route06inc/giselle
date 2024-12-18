import type { ArtifactReference } from "../../../artifact/types";
import { buildConnector } from "../../../connector/utils";
import { parseFile, uploadFile } from "../../../files/server-actions";
import {
	type GiselleFile,
	type ProcessedFile,
	fileStatuses,
} from "../../../files/types";
import { createStringParameter } from "../../../giselle-node/parameter/factory";
import type { GiselleNodeId } from "../../../giselle-node/types";
import type { TextContent } from "../../../text-content/types";
import type { WebSearch } from "../../../web-search/types";
import type { CompositeAction } from "../../context";
import { addConnector } from "./add-connector";
import { updateNode } from "./update-node";

export type Source = ArtifactReference | TextContent | WebSearch | GiselleFile;
type AddSourceInput = {
	source: Source;
	/**
	 * Instruction Node
	 */
	nodeId: GiselleNodeId;
};

export function addSource({
	input,
}: { input: AddSourceInput }): CompositeAction {
	return (dispatch, getState) => {
		const node = getState().graph.nodes.find(
			(node) => node.id === input.nodeId,
		);
		if (node === undefined) {
			throw new Error(`Node not found: ${input.nodeId}`);
		}

		// Add the source to the instruction node property
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
						sources: [...currentSources, input.source],
					},
				},
			}),
		);
		dispatch(
			connectRelevanceNodes({
				input,
			}),
		);
		dispatch(
			uploadSource({
				input,
			}),
		);
	};
}

interface ConnectRelevanceNodesInput {
	source: Source;
	/**
	 * Instruction Node
	 */
	nodeId: GiselleNodeId;
}
export function connectRelevanceNodes({
	input,
}: { input: ConnectRelevanceNodesInput }): CompositeAction {
	return (dispatch, getState) => {
		// Add the parameter of the source to the target node
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
		const sourceCreatorNode = getState().graph.nodes.find(
			(node) => node.id === sourceCreatorNodeId,
		);
		if (sourceCreatorNode === undefined) {
			return;
		}
		const targetNodes = getState()
			.graph.connectors.filter((connector) => connector.source === input.nodeId)
			.map((instructionToActionConnector) =>
				getState().graph.nodes.find(
					(node) => node.id === instructionToActionConnector.target,
				),
			)
			.filter((nodeOrUndefined) => nodeOrUndefined !== undefined);
		for (const targetNode of targetNodes) {
			if (targetNode.parameters?.object !== "objectParameter") {
				throw new Error(
					`Target node ${targetNode.id} does not have an object parameter`,
				);
			}
			const currentSourceHandleLength = Object.keys(
				targetNode.parameters.properties,
			).filter((key) => key.startsWith("source")).length;
			dispatch(
				updateNode({
					input: {
						nodeId: targetNode.id,
						parameters: {
							...targetNode.parameters,
							properties: {
								...targetNode.parameters.properties,
								[`source${currentSourceHandleLength + 1}`]:
									createStringParameter({
										label: `Source${currentSourceHandleLength + 1}`,
									}),
							},
						},
					},
				}),
			);
			dispatch(
				addConnector({
					input: {
						connector: buildConnector({
							sourceNode: {
								id: sourceCreatorNode.id,
								category: sourceCreatorNode.category,
								archetype: sourceCreatorNode.archetype,
							},
							targetNode: {
								id: targetNode.id,
								handle: `source${currentSourceHandleLength + 1}`,
								category: targetNode.category,
								archetype: targetNode.archetype,
							},
						}),
					},
				}),
			);
		}
	};
}

interface UploadSourceInput {
	source: Source;
	/**
	 * Instruction Node
	 */
	nodeId: GiselleNodeId;
}
export function uploadSource({
	input,
}: { input: UploadSourceInput }): CompositeAction {
	return async (dispatch, getState) => {
		switch (input.source.object) {
			case "file": {
				if (input.source.status === fileStatuses.uploading) {
					const fileVercelBlob = await uploadFile({
						input: {
							file: input.source.file,
							fileId: input.source.id,
						},
					});
					const node = getState().graph.nodes.find(
						(node) => node.id === input.nodeId,
					);
					if (node === undefined) {
						throw new Error(`Node not found: ${input.nodeId}`);
					}

					// Add the source to the instruction node property
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
									sources: currentSources.map((source) =>
										source.id === input.source.id
											? {
													...source,
													blobUrl: fileVercelBlob.url,
													status: fileStatuses.processing,
												}
											: source,
									),
								},
							},
						}),
					);

					const structuredDataVercelBlob = await parseFile({
						id: input.source.id,
						name: input.source.name,
						blobUrl: fileVercelBlob.url,
					});

					dispatch(
						updateNode({
							input: {
								nodeId: input.nodeId,
								properties: {
									...node.properties,
									sources: currentSources.map((source) =>
										source.id === input.source.id
											? ({
													...source,
													blobUrl: fileVercelBlob.url,
													structuredDataBlobUrl: structuredDataVercelBlob.url,
													status: fileStatuses.processed,
												} satisfies ProcessedFile)
											: source,
									),
								},
							},
						}),
					);
				}
			}
		}
	};
}
