import type { GiselleNodeArchetype } from "../giselle-node/blueprints";
import type { GiselleNodeCategory, GiselleNodeId } from "../giselle-node/types";

export type ConnectorId = `cn_${string}`;
export type ConnectorObject = {
	id: ConnectorId;
	object: "connector";
	source: GiselleNodeId;
	sourceNodeCategory: GiselleNodeCategory;
	sourceNodeArcheType: GiselleNodeArchetype;
	target: GiselleNodeId;
	targetHandle: string;
	targetNodeCategory: GiselleNodeCategory;
	targetNodeArcheType: GiselleNodeArchetype;
};
