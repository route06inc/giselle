import { setNodes } from "../../../giselle-node/actions";
import type { Parameter } from "../../../giselle-node/parameter/types";
import type { GiselleNode, GiselleNodeId } from "../../../giselle-node/types";
import type { CompositeAction } from "../../context";
import { setXyFlowNodes } from "../xy-flow";

interface UpdateNodeInput {
	nodeId: GiselleNodeId;
	isFinal?: boolean;
	properties?: Record<string, unknown>;
	parameters?: Parameter | undefined;
	ui?: Partial<GiselleNode["ui"]>;
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
									isFinal: input.isFinal ?? node.isFinal,
									properties: input.properties ?? node.properties,
									parameters: input.parameters ?? node.parameters,
									ui: {
										...node.ui,
										...input.ui,
									},
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
									selected: input.ui?.selected ?? xyFlowNode.selected,
									position: input.ui?.position ?? xyFlowNode.position,
									data: {
										...xyFlowNode.data,
										isFinal: input.isFinal ?? xyFlowNode.data.isFinal,
										properties: input.properties ?? xyFlowNode.data.properties,
										parameters: input.parameters ?? xyFlowNode.data.parameters,
										ui: {
											...xyFlowNode.data.ui,
											...input.ui,
										},
									},
								},
					),
				},
			}),
		);
	};
}
