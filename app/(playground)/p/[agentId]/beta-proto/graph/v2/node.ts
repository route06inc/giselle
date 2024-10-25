import type { GiselleNode, GiselleNodeId } from "../../giselle-node/types";

const v2NodeActionTypes = {
	updateNode: "v2.updateNode",
	set: "v2.setNodes",
} as const;
type V2NodeActionType =
	(typeof v2NodeActionTypes)[keyof typeof v2NodeActionTypes];
export function isV2NodeAction(action: unknown): action is V2NodeAction {
	return Object.values(v2NodeActionTypes).includes(
		(action as V2NodeAction).type,
	);
}
interface UpdateNodeAction {
	type: Extract<V2NodeActionType, "v2.updateNode">;
	input: UpdateNodeInput;
}
interface UpdateNodeInput {
	id: GiselleNodeId;
	isFinal?: boolean;
}
export function updateNode({
	input,
}: { input: UpdateNodeInput }): UpdateNodeAction {
	return {
		type: v2NodeActionTypes.updateNode,
		input,
	};
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

export type V2NodeAction = UpdateNodeAction | SetNodesAction;

export function v2NodeReducer(
	nodes: GiselleNode[],
	action: V2NodeAction,
): GiselleNode[] {
	switch (action.type) {
		case v2NodeActionTypes.updateNode:
			return nodes.map((node) => {
				if (node.id === action.input.id) {
					return {
						...node,
						isFinal: action.input.isFinal ?? false,
					};
				}
				return node;
			});
		case v2NodeActionTypes.add:
			return [...nodes, action.input.node];
		case v2NodeActionTypes.set:
			return action.input.nodes;
	}
	return nodes;
}
