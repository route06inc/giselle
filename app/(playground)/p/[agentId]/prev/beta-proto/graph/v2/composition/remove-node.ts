import { setNodes } from "../../../giselle-node/actions";
import type { GiselleNodeId } from "../../../giselle-node/types";
import type { CompositeAction } from "../../context";
import { setXyFlowEdges, setXyFlowNodes } from "../xy-flow";

interface RemoveNodeInput {
	nodeId: GiselleNodeId;
}
export function removeNode({
	input,
}: { input: RemoveNodeInput }): CompositeAction {
	return (dispatch, getState) => {
		dispatch(
			setNodes({
				input: {
					nodes: getState().graph.nodes.filter(
						(node) => node.id !== input.nodeId,
					),
				},
			}),
		);
		dispatch(
			setXyFlowNodes({
				input: {
					xyFlowNodes: getState().graph.xyFlow.nodes.filter(
						(node) => node.id !== input.nodeId,
					),
				},
			}),
		);
	};
}
