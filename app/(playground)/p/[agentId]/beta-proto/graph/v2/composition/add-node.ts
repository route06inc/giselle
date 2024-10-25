import { createGiselleNodeId } from "../../../giselle-node/factory";
import type {
	GiselleNodeBlueprint,
	XYPosition,
} from "../../../giselle-node/types";
import { giselleNodeType } from "../../../react-flow-adapter/giselle-node";
import { addNode as oldAddNode } from "../../actions";
import type { ThunkAction } from "../../context";
import { setXyFlowNode } from "../xy-flow-node";

interface AddNodeInput {
	node: GiselleNodeBlueprint;
	position: XYPosition;
	name: string;
	isFinal?: boolean;
	properties?: Record<string, unknown>;
}

export const addNode = (input: AddNodeInput): ThunkAction => {
	return (dispatch, getState) => {
		const state = getState();
		const oldAction = oldAddNode(input);
		dispatch(oldAction);
		dispatch(
			setXyFlowNode({
				input: {
					xyFlowNodes: [
						...state.graph.xyFlowNodes,
						{
							id: oldAction.payload.node.id,
							type: giselleNodeType,
							position: input.position,
							data: oldAction.payload.node,
						},
					],
				},
			}),
		);
	};
};
