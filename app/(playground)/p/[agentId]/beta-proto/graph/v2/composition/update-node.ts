import { setNodes } from "../../../giselle-node/actions";
import type { Parameter } from "../../../giselle-node/parameter/types";
import type { GiselleNodeId } from "../../../giselle-node/types";
import type { CompositeAction } from "../../context";
import { setXyFlowNodes } from "../xy-flow";

interface UpdateNodeInput {
	nodeId: GiselleNodeId;
	properties?: Record<string, unknown>;
	parameters?: Parameter | undefined;
}

export function updateNode({
	input,
}: { input: UpdateNodeInput }): CompositeAction {
	return (dispatch, getState) => {
		dispatch(
			setNodes({
				input: {
					nodes: getState().graph.nodes.map((node) =>
						node.id !== input.nodeId
							? node
							: {
									...node,
									properties: input.properties ?? node.properties,
									parameters: input.parameters ?? node.parameters,
								},
					),
				},
			}),
		);
		dispatch(
			setXyFlowNodes({
				input: {
					xyFlowNodes: getState().graph.xyFlow.nodes.map((xyFlowNode) =>
						xyFlowNode.id !== input.nodeId
							? xyFlowNode
							: {
									...xyFlowNode,
									data: {
										...xyFlowNode.data,
										properties: input.properties ?? xyFlowNode.data.properties,
										parameters: input.parameters ?? xyFlowNode.data.parameters,
									},
								},
					),
				},
			}),
		);
	};
}
