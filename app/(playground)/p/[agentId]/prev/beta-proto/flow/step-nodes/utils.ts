import type { GiselleNode } from "../../giselle-node/types";
import type { StepNode } from "./types";

export function buildStepNode(node: GiselleNode): StepNode {
	return {
		id: node.id,
		object: "node",
		name: node.name,
		archetype: node.archetype,
	} satisfies StepNode;
}
