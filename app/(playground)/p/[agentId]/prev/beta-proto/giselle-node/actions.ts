import type { GiselleNode, GiselleNodeId } from "./types";

const v2NodeActionTypes = {
	set: "v2.setNodes",
} as const;
type V2NodeActionType =
	(typeof v2NodeActionTypes)[keyof typeof v2NodeActionTypes];
export function isV2NodeAction(action: unknown): action is V2NodeAction {
	return Object.values(v2NodeActionTypes).includes(
		(action as V2NodeAction).type,
	);
}

interface SetNodesAction {
	type: Extract<V2NodeActionType, "v2.setNodes">;
	input: SetNodeInput;
}
interface SetNodeInput {
	nodes: GiselleNode[];
}
export function setNodes({ input }: { input: SetNodeInput }) {
	return {
		type: v2NodeActionTypes.set,
		input,
	};
}

export type V2NodeAction = SetNodesAction;

export function v2NodeReducer(
	nodes: GiselleNode[],
	action: V2NodeAction,
): GiselleNode[] {
	switch (action.type) {
		case v2NodeActionTypes.set:
			return action.input.nodes;
	}
	return nodes;
}
