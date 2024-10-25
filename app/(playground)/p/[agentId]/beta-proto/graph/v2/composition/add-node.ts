import type { GiselleNode } from "../../../giselle-node/types";
import { giselleNodeType } from "../../../react-flow-adapter/giselle-node";
import type { CompositeAction } from "../../context";
import { addNode as addNodeInternal } from "../node";
import { setXyFlowNodes } from "../xy-flow-node";

interface AddNodeInput {
	node: GiselleNode;
}

export const addNode = ({
	input,
}: { input: AddNodeInput }): CompositeAction => {
	return (dispatch, getState) => {
		dispatch(addNodeInternal({ input: { node: input.node } }));
		dispatch(
			setXyFlowNodes({
				input: {
					xyFlowNodes: [
						...getState().graph.xyFlow.nodes,
						{
							id: input.node.id,
							type: giselleNodeType,
							position: input.node.ui.position,
							data: input.node,
						},
					],
				},
			}),
		);
	};
};
