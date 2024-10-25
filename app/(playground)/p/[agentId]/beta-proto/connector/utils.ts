import type { GiselleNodeArchetype } from "../giselle-node/blueprints";
import type { GiselleNodeCategory, GiselleNodeId } from "../giselle-node/types";
import { createConnectorId } from "./factory";
import type { ConnectorObject } from "./types";

interface BuildConnectorArgs {
	sourceNode: {
		id: GiselleNodeId;
		category: GiselleNodeCategory;
		archetype: GiselleNodeArchetype;
	};
	targetNode: {
		id: GiselleNodeId;
		handle: string;
		category: GiselleNodeCategory;
		archetype: GiselleNodeArchetype;
	};
}
export function buildConnector(args: BuildConnectorArgs) {
	return {
		id: createConnectorId(),
		object: "connector",
		source: args.sourceNode.id,
		sourceNodeCategory: args.sourceNode.category,
		sourceNodeArcheType: args.sourceNode.archetype,
		target: args.targetNode.id,
		targetHandle: args.targetNode.handle,
		targetNodeCategory: args.targetNode.category,
		targetNodeArcheType: args.targetNode.archetype,
	} satisfies ConnectorObject;
}
