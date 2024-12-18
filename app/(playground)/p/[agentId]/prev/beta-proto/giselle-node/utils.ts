import { createGiselleNodeId } from "./factory";
import {
	createObjectParameter,
	createStringParameter,
} from "./parameter/factory";
import type { ObjectParameter, StringParameter } from "./parameter/types";
import {
	type GiselleNode,
	type GiselleNodeArtifactElement,
	type GiselleNodeBlueprint,
	type XYPosition,
	giselleNodeState,
} from "./types";

export function giselleNodeToGiselleNodeArtifactElement(
	node: GiselleNode,
): GiselleNodeArtifactElement {
	return {
		id: node.id,
		object: "node.artifactElement",
		name: node.name,
		archetype: node.archetype,
	};
}

interface BuildGiselleNodeArg {
	node: GiselleNodeBlueprint;
	position: XYPosition;
	name: string;
	isFinal?: boolean;
	properties?: Record<string, unknown>;
}
export function buildGiselleNode(args: BuildGiselleNodeArg) {
	let parameters: ObjectParameter | StringParameter | undefined;
	if (args.node.parameters?.type === "object") {
		parameters = createObjectParameter(args.node.parameters);
	} else if (args.node.parameters?.type === "string") {
		parameters = createStringParameter(args.node.parameters);
	}
	return {
		object: "node",
		name: args.name,
		category: args.node.category,
		id: createGiselleNodeId(),
		archetype: args.node.archetype,
		resultPortLabel: args.node.resultPortLabel,
		parameters,
		ui: { position: args.position },
		properties: args.properties ?? {},
		state: giselleNodeState.idle,
		isFinal: args.isFinal ?? false,
		output: "",
	} satisfies GiselleNode;
}
