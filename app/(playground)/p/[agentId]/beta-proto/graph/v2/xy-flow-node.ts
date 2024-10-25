import type { GiselleNode, GiselleNodeId } from "../../giselle-node/types";
import type { ReactFlowNode } from "../../react-flow-adapter/giselle-node";

const v2XyFlowNodeActionTypes = {
	set: "v2.setXyFlowNode",
} as const;
type V2NodeActionType =
	(typeof v2XyFlowNodeActionTypes)[keyof typeof v2XyFlowNodeActionTypes];

interface SetXyFlowNodeAction {
	type: Extract<V2NodeActionType, "v2.setXyFlowNode">;
	input: SetXyFlowNodeInput;
}
interface SetXyFlowNodeInput {
	xyFlowNodes: ReactFlowNode[];
}
export function setXyFlowNode({
	input,
}: { input: SetXyFlowNodeInput }): SetXyFlowNodeAction {
	return {
		type: v2XyFlowNodeActionTypes.set,
		input,
	};
}

export type V2XyFlowNodeAction = SetXyFlowNodeAction;

export function isV2XyFlowNodeAction(
	action: unknown,
): action is V2XyFlowNodeAction {
	return Object.values(v2XyFlowNodeActionTypes).includes(
		(action as V2XyFlowNodeAction).type,
	);
}

export function v2XyFlowNodeReducer(
	nodes: ReactFlowNode[],
	action: V2XyFlowNodeAction,
): ReactFlowNode[] {
	switch (action.type) {
		case v2XyFlowNodeActionTypes.set:
			return action.input.xyFlowNodes;
	}
	return nodes;
}
