import type { GiselleNode, GiselleNodeId } from "../../giselle-node/types";
import type {
	ReactFlowEdge,
	ReactFlowNode,
} from "../../react-flow-adapter/types";
import type { XYFlow } from "../types";

const v2XyFlowActionTypes = {
	setNodes: "v2.setXyFlowNodes",
	setEdges: "v2.setXyFlowEdges",
} as const;
type V2XyFlowActionType =
	(typeof v2XyFlowActionTypes)[keyof typeof v2XyFlowActionTypes];

interface SetXyFlowNodeAction {
	type: Extract<V2XyFlowActionType, "v2.setXyFlowNodes">;
	input: SetXyFlowNodeInput;
}
interface SetXyFlowNodeInput {
	xyFlowNodes: ReactFlowNode[];
}
export function setXyFlowNodes({
	input,
}: { input: SetXyFlowNodeInput }): SetXyFlowNodeAction {
	return {
		type: v2XyFlowActionTypes.setNodes,
		input,
	};
}

interface SetXYFlowEdgeAction {
	type: Extract<V2XyFlowActionType, "v2.setXyFlowEdges">;
	input: SetXYFlowEdgeInput;
}
interface SetXYFlowEdgeInput {
	xyFlowEdges: ReactFlowEdge[];
}
export function setXyFlowEdges({
	input,
}: { input: SetXYFlowEdgeInput }): SetXYFlowEdgeAction {
	return {
		type: v2XyFlowActionTypes.setEdges,
		input,
	};
}

export type V2XyFlowAction = SetXyFlowNodeAction | SetXYFlowEdgeAction;

export function isV2XyFlowAction(action: unknown): action is V2XyFlowAction {
	return Object.values(v2XyFlowActionTypes).includes(
		(action as V2XyFlowAction).type,
	);
}

export function v2XyFlowReducer(
	xyflow: XYFlow,
	action: V2XyFlowAction,
): XYFlow {
	switch (action.type) {
		case v2XyFlowActionTypes.setNodes:
			return { ...xyflow, nodes: action.input.xyFlowNodes };
		case v2XyFlowActionTypes.setEdges:
			return { ...xyflow, edges: action.input.xyFlowEdges };
	}
	return xyflow;
}
