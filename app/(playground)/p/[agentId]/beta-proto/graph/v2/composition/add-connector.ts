import { setConnectors } from "../../../connector/actions";
import type { ConnectorObject } from "../../../connector/types";
import { giselleEdgeType } from "../../../react-flow-adapter/giselle-node";
import type { CompositeAction } from "../../context";
import { setXyFlowEdges } from "../xy-flow";

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
	};
}
