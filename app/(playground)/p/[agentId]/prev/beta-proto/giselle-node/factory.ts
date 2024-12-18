import { createId } from "@paralleldrive/cuid2";
import type { GiselleNodeBlueprint, GiselleNodeId } from "./types";

export function createGiselleNodeId(): GiselleNodeId {
	return `nd_${createId()}`;
}
export function createGiselleNodeBlueprint(
	giselleNode: Omit<GiselleNodeBlueprint, "object">,
): GiselleNodeBlueprint {
	return { ...giselleNode, object: "nodeBlueprint" as const };
}
