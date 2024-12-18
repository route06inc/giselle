import { setConnectors } from "../../../connector/actions";
import type { ConnectorObject } from "../../../connector/types";
import { giselleEdgeType } from "../../../react-flow-adapter/types";
import type { CompositeAction } from "../../context";
import { setXyFlowEdges } from "../xy-flow";
import { updateNode } from "./update-node";

interface AddConnectorInput {
	connector: ConnectorObject;
}
export function addConnector({
	input,
}: { input: AddConnectorInput }): CompositeAction {
	return (dispatch, getState) => {
		dispatch(
			setConnectors({
				input: {
					connectors: [...getState().graph.connectors, input.connector],
				},
			}),
		);
		dispatch(
			setXyFlowEdges({
				input: {
					xyFlowEdges: [
						...getState().graph.xyFlow.edges,
						{
							id: input.connector.id,
							type: giselleEdgeType,
							source: input.connector.source,
							target: input.connector.target,
							targetHandle: input.connector.targetHandle,
							data: input.connector,
						},
					],
				},
			}),
		);
		const sourceNode = getState().graph.nodes.find(
			(node) => node.id === input.connector.source,
		);
		if (sourceNode?.isFinal) {
			dispatch(
				updateNode({
					input: {
						nodeId: sourceNode.id,
						isFinal: false,
					},
				}),
			);
			dispatch(
				updateNode({
					input: {
						nodeId: input.connector.target,
						isFinal: true,
					},
				}),
			);
		}
	};
}
