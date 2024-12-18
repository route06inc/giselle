import type { GiselleNodeId } from "../../giselle-node/types";

export interface StepNode {
	id: GiselleNodeId;
	object: "node";
	archetype: string;
	name: string;
}
