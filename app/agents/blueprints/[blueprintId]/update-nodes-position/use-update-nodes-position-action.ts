import {
	type Node,
	useBlueprint,
	useBlueprintId,
} from "@/app/agents/blueprints";
import { useCallback } from "react";
import type { Payload } from "./route";

export const useUpdateNodesPositionAction = () => {
	const blueprintId = useBlueprintId();
	const { mutateWithCache } = useBlueprint();
	const updateNodesPosition = useCallback(
		async (payload: Payload) => {
			if (blueprintId == null) {
				return;
			}
			mutateWithCache({
				sendRequest: execApi(blueprintId, payload),
				mutateWithCache: (prev, json) => ({
					blueprint: {
						...prev.blueprint,
						nodes: populateNodes(prev.blueprint.nodes, payload),
					},
				}),
				optimisticDataWithCache: (prev) => ({
					blueprint: {
						...prev.blueprint,
						nodes: populateNodes(prev.blueprint.nodes, payload),
					},
				}),
			});
		},
		[blueprintId, mutateWithCache],
	);
	return { updateNodesPosition };
};

const execApi = (blueprintId: number, payload: Payload) =>
	fetch(`/agents/blueprints/${blueprintId}/update-nodes-position`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

const populateNodes = (currentNodes: Node[], payload: Payload) =>
	currentNodes.map((node) => {
		const update = payload.nodes.find((n) => n.id === node.id);
		if (update == null) {
			return node;
		}
		return {
			...node,
			position: update.position,
		};
	});
